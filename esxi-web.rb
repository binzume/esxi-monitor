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

    result = ESXI.instance.guest(params[:vmid])
    if result && result[:_type] == "vim.fault.NotFound"
      halt 404, {:status => 'error', :message => result["msg"]}.to_json
    end

    {:status=> 'ok', :guest => result}.to_json
  end

  get '/api/v1/vms/:vmid' do
    content_type :json
    halt 400, {:status => 'error', :message => 'Not login'}.to_json unless ESXI.instance

    result = ESXI.instance.summary(params[:vmid])
    if result && result[:_type] == "vim.fault.NotFound"
      halt 404, {:status => 'error', :message => result["msg"]}.to_json
    end

    {:status=> 'ok', :summary => result}.to_json
  end

  delete '/api/v1/vms/:vmid' do
    content_type :json
    halt 403, {:status => 'error', :message => 'Not login'}.to_json unless ESXI.instance
    halt 403, {:status => 'error', :message => 'bad token'}.to_json if request.env['HTTP_X_CSRFTOKEN'] != settings.token

    puts ESXI.instance.destroy!(params[:vmid])

    {:status=> 'ok'}.to_json
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
      t = Thread.new do
        sleep(3)
        ESXI.instance.fork {|conn|
          10.times do
            r = conn.exec!('vim-cmd vmsvc/message ' + params[:vmid])
            puts r
            if r =~/^Virtual machine message\s*([^\s:]+):/
              puts $1
              puts conn.exec!("vim-cmd vmsvc/message #{params[:vmid]} #{$1} 2")
              break
            end
            sleep(2)
          end
        }
      end
      puts ESXI.instance.power_on(params[:vmid])
      t.terminate
    elsif v == 'off'
      ESXI.instance.power_off(params[:vmid])
    elsif v == 'shutdown'
      ESXI.instance.shutdown(params[:vmid])
    elsif v == 'reboot'
      ESXI.instance.reboot(params[:vmid])
    else
      halt 400, 'Bad Request'
    end

    content_type :json
    {:status => '?'}.to_json
  end

  # copy vm
  post '/api/v1/vms/:vmid/copy' do
    halt 403, {:status => 'error', :message => 'bad token'}.to_json if request.env['HTTP_X_CSRFTOKEN'] != settings.token
    halt 403, {:status => 'error', :message => 'Not login'}.to_json unless ESXI.instance
    halt 400, {:status => 'error', :message => 'param error: name'}.to_json unless params['name'] && params['name'] =~ /^[\w_-]+$/
    halt 400, {:status => 'error', :message => 'param error: macaddr'}.to_json unless params['macaddr'] && params['macaddr'] =~ /^[\w:]+$/
    name = params['name']
    macaddr = params['macaddr']
    dir = name
    srcvmid = params[:vmid]

    esxi = ESXI.instance
    summary = esxi.summary(srcvmid)
    if summary["config"]["vmPathName"] =~/\[([^\]]+)\]\s*(.+)/
      src = "/vmfs/volumes/" + $1 + "/" + $2
      src_dir = File.dirname(src)
      dst_dir = '/vmfs/volumes/' + $1 + '/' + dir
    end

    # FIXME! vmdk name, etc...
    puts esxi.exec!('rm -r ' + dst_dir) if params['force']
    puts esxi.exec!('mkdir ' + dst_dir)
    img_name = if esxi.exec!("cat '#{src}' | grep '^scsi0:0.fileName'") =~/fileName = "([^"]+)"/
      $1
    end
    puts "vmdk: #{img_name}"
    r = esxi.exec!("vmkfstools -i #{src_dir}/#{img_name} -d thin #{dst_dir}/#{img_name}")
    puts r
    unless r =~/done./
      halt 500, {:status => 'error', :message => 'vmdk copy failed'}.to_json
    end
    puts esxi.exec!("find #{src_dir} -type f ! -name '*.vmdk' ! -name '*.log' ! -name '*.vswp' -exec cp -f {} #{dst_dir} ';'")
    puts esxi.exec!("sed -i 's/ethernet0.address\s*=\s*\"[^\"]*\"/ethernet0.address = \"#{macaddr}\"/' #{dst_dir}/*.vmx")
    created_vmid = esxi.exec!("vim-cmd solo/registervm #{dst_dir}/#{File.basename(src)} #{name}")

    content_type :json
    {:status => 'ok?', :vmid => created_vmid.strip}.to_json
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

