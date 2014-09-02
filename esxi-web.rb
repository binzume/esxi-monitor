#!/usr/bin/env ruby
# coding: utf-8

require 'sinatra/base'
require 'json'
require 'securerandom'
require_relative 'esxi'

module ESXI
   class << self
    attr_accessor :instance
   end
end


class ESXiMonitorWeb < Sinatra::Base

  # cross origin api
  disable :protection

  def initialize(app = nil, params = {})
    super(app)
  end

  set :token, SecureRandom.hex

  before do
   allow_origin = ".dwango.co.jp"
   if request.env['HTTP_ORIGIN'] && (request.env['HTTP_ORIGIN'].sub(/\/$/,'').end_with?(allow_origin) || request.env['HTTP_ORIGIN'] == "null")
     headers 'Access-Control-Allow-Origin' => request.env['HTTP_ORIGIN'],
             'Access-Control-Allow-Methods' => ['OPTIONS', 'GET', 'POST']
   end
  end

  get '/status' do
    content_type :json
    {:status => 'ok'}.to_json
  end

  get '/api/v1/vms/:vmid/guest' do
    content_type :json
    halt 400, {:status => 'error', :message => 'Not login'}.to_json unless ESXI.instance

    {:status=> 'ok', :guest => ESXI.instance.guest(params[:vmid])}.to_json
  end

  get '/api/v1/vms/:vmid' do
    content_type :json
    halt 400, {:status => 'error', :message => 'Not login'}.to_json unless ESXI.instance

    {:status=> 'ok', :guest => ESXI.instance.summary(params[:vmid])}.to_json
  end

  get '/api/v1/vms' do
    content_type :json
    halt 400, {:status => 'error', :message => 'Not login'}.to_json unless ESXI.instance


    {:status=> 'ok', :vms => ESXI.instance.allvms()}.to_json
  end

  post '/api/v1/vms/:vmid/power' do
    halt 403, {:status => 'error', :message => 'bad token'}.to_json if request.env['HTTP_X_CSRFTOKEN'] != settings.token
    halt 400, {:status => 'error', :message => 'Not login'}.to_json unless ESXI.instance

    v = request.body.read
    if v == 'on'
      puts ESXI.instance.power_on(params[:vmid])
    elsif v == 'off'
      ESXI.instance.power_off(params[:vmid])
    elsif v == 'reboot'
      ESXI.instance.reboot(params[:vmid])
    else
      halt 400, 'Bad Request'
    end

    content_type :json
    {:status => '?'}.to_json
  end

  get '/api/v1/esxi/disconnect' do
    halt 200, {:status => 'ok', :message => 'already disconnected'}.to_json unless ESXI.instance

    begin
      ESXI.instance.close
    rescue Exception => e
        warn e
        warn e.backtrace.join("\r\t")
    end

    ESXI.instance = nil

    content_type :json
    {:status => 'ok'}.to_json
  end

  post '/api/v1/esxi/connect' do
    halt 200, {:status => 'ok', :message => 'already connected'}.to_json if ESXI.instance

    begin
      ESXI.instance = ESXi.new({
        :host => settings.conf['esxi_host'],
        :user => params['user'],
        :password => params['password'],
      })
      ESXI.instance.connect
    rescue Exception => e
        warn e
        warn e.backtrace.join("\r\t")
        ESXI.instance = nil
    end

    content_type :json
    {:status => (ESXI.instance ? 'ok' : 'error')}.to_json
  end

  get '/api/v1/esxi/status' do
    content_type :json
    user = ESXI.instance ? ESXI.instance.user : "";
    {:status => 'ok', :host => settings.conf['esxi_host'], :connected => (ESXI.instance != nil), :user => user, :token => settings.token}.to_json
  end

  get '/*' do
    file = if params[:splat][0] == ""
      "index.html"
    else
      params[:splat][0]
    end
    send_file('public/' + file,  {:stream => false})
  end

end


conf = if File.exist?("conf/app.json")
  open("conf/app.json") {|f| JSON.parse(f.read) }
else
  {"esxi_host" => "", "ssh_port" => 22}
end

conf["esxi_host"] = ENV['ESXI_HOST'] if ENV['ESXI_HOST']
conf["ssh_port"] = ENV['ESXI_SSH_PORT'] if ENV['ESXI_SSH_PORT']

ESXiMonitorWeb.set :conf, conf
#ESXiMonitorWeb.set :esxi, nil
ESXiMonitorWeb.run! :host => 'localhost', :port => (ARGV[0] || 4567)

