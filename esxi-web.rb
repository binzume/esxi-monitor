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

  get '/api/v1/vms/:vmid/guest' do
    content_type :json
    halt 400, {:status => 'error', :message => 'Not login'}.to_json unless ESXI.instance

    result = ESXI.instance.guest(params[:vmid])
    if result && result[:_type] == "vim.fault.NotFound"
      halt 404, {:status => 'error', :message => result["msg"]}.to_json
    end

    {:status=> 'ok', :guest => result}.to_json
  end

  get '/api/v1/vms/:vmid/config' do
    content_type :json
    halt 400, {:status => 'error', :message => 'Not login'}.to_json unless ESXI.instance

    result = ESXI.instance.config(params[:vmid])
    if result && result[:_type] == "vim.fault.NotFound"
      halt 404, {:status => 'error', :message => result["msg"]}.to_json
    end

    {:status=> 'ok', :config => result}.to_json
  end

  get '/api/v1/vms/:vmid/runtime' do
    content_type :json
    halt 400, {:status => 'error', :message => 'Not login'}.to_json unless ESXI.instance

    result = ESXI.instance.runtime(params[:vmid])
    if result && result[:_type] == "vim.fault.NotFound"
      halt 404, {:status => 'error', :message => result["msg"]}.to_json
    end

    {:status=> 'ok', :runtime => result}.to_json
  end

  get '/api/v1/vms' do
    content_type :json
    halt 400, {:status => 'error', :message => 'Not login'}.to_json unless ESXI.instance

    {:status=> 'ok', :vms => ESXI.instance.allvms()}.to_json
  end

  get '/api/v1/vms/:vmid/power' do
    content_type :json
    halt 400, {:status => 'error', :message => 'Not login'}.to_json unless ESXI.instance

    result = ESXI.instance.runtime(params[:vmid])
    if result && result[:_type] == "vim.fault.NotFound"
      halt 404, {:status => 'error', :message => result["msg"]}.to_json
    end

    {:status=> 'ok', :power => result["powerState"]}.to_json
  end

  post '/api/v1/vms/:vmid/power' do
    halt 403, {:status => 'error', :message => 'bad token'}.to_json if request.env['HTTP_X_CSRFTOKEN'] != settings.token
    halt 400, {:status => 'error', :message => 'Not login'}.to_json unless ESXI.instance

    v = request.body.read
    if v == 'on'
      ESXI.instance.power_on_with_answer(params[:vmid], 2)
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

  # new vm(experimental)
  post '/api/v1/vms/' do
    halt 403, {:status => 'error', :message => 'bad token'}.to_json if request.env['HTTP_X_CSRFTOKEN'] != settings.token && params['csrf_token'] != settings.token
    halt 403, {:status => 'error', :message => 'Not login'}.to_json unless ESXI.instance
    halt 400, {:status => 'error', :message => 'param error: name'}.to_json unless params['name'] && params['name'] =~ /^[\w_-]+$/

    name = params['name']
    dirname = name
    datastore = 'datastore1' # fixme!
    vmpath = '/vmfs/volumes/datastore1/' + dirname
    guestos = params['guestos'] || "otherlinux-64"

    esxi = ESXI.instance
    r = esxi.exec!("vim-cmd vmsvc/createdummyvm #{name} [#{datastore}] /#{dirname}/#{name}.vmx")
    halt 503, {:status => 'error', :message => 'cant create vm'}.to_json unless r =~ /^\d+/
    vmid = r

    vmxpath = "#{vmpath}/#{name}.vmx"
    r = esxi.exec!("echo guestOS = \\\"#{guestos}\\\" >> #{vmxpath}")

    if params['memsize'] && params['memsize'] =~ /^\d+$/
      r = esxi.exec!("echo memsize = \"#{params['memsize']}\" >> #{vmxpath}")
    end

    if params['numvcpus'] && params['numvcpus'] =~ /^\d+$/
      r = esxi.exec!("echo numvcpus = \"#{params['numvcpus']}\" >> #{vmxpath}")
    end

    if true
      r = esxi.exec!("echo ethernet0.present = \"TRUE\" >> #{vmxpath}")
      r = esxi.exec!("echo ethernet0.virtualDev = \\\"e1000\\\" >> #{vmxpath}")
      r = esxi.exec!("echo ethernet0.features = \\\"15\\\" >> #{vmxpath}")
      r = esxi.exec!("echo ethernet0.networkName = \\\"VM Network\\\" >> #{vmxpath}")
      ## ethernet0.addressType = "static"
      ## ethernet0.address = "00:50:56:xx:xx:xx"
    end

    if params['vnc_enable'] && params['vnc_enable'] == 'on'
      r = esxi.exec!("echo RemoteDisplay.vnc.enabled = \\\"TRUE\\\" >> #{vmxpath}")
      r = esxi.exec!("echo RemoteDisplay.vnc.port = \\\"#{params['vnc_port']}\\\" >> #{vmxpath}")
      r = esxi.exec!("echo RemoteDisplay.vnc.password = \\\"#{params['vnc_passwd']}\\\" >> #{vmxpath}")
      r = esxi.exec!("echo RemoteDisplay.vnc.keyMap = \\\"jp\\\" >> #{vmxpath}")
    end

    if params['disk_size'] && params['disk_size'] =~ /^\d+\w*$/
      img_name = if esxi.exec!("cat '#{vmxpath}' | grep '^scsi0:0.fileName'") =~/fileName = "([^"]+)"/
        $1
      else
        "#{name}.vmdk"
      end
      r = esxi.exec!("rm -f #{vmpath}/*.vmdk")
      r = esxi.exec!("vmkfstools --createvirtualdisk #{params['disk_size']} -d thin #{vmpath}/#{img_name}")
    end

    # reload vmx
    r = esxi.exec!("vim-cmd vmsvc/reload #{vmid}")

    content_type :json
    {:status => 'probably ok'}.to_json
  end

  get '/api/v1/esxi/datastore/isoimages' do

    datastore = 'datastore1' # fixme!
    dir = '/vmfs/volumes/' + datastore + '/images'

    esxi = ESXI.instance
    r = esxi.exec!("ls #{dir}/*.iso")

    content_type :json
    {:status => 'ok', :images => r.split(/\s+/)}.to_json
  end

  post '/api/v1/vms/:vmid/config/cdrom' do

    vmid = params[:vmid]
    esxi = ESXI.instance
    summary = esxi.summary(vmid)
    if summary["config"]["vmPathName"] =~/\[([^\]]+)\]\s*(.+)/
      vmxpath = "/vmfs/volumes/" + $1 + "/" + $2
      vmdir = File.dirname(vmxpath)
    else
      halt 503
    end

    dev = 'ide1:0'
    image = params['image']
    connect = params['connect'] == 'on'

    r = esxi.exec!("sed -i '/^#{dev}\\\./d' #{vmxpath}")
    if image
      r = esxi.exec!("echo #{dev}.present = \\\"TRUE\\\" >> #{vmxpath}")
      r = esxi.exec!("echo #{dev}.clientDevice = \\\"FALSE\\\" >> #{vmxpath}")
      r = esxi.exec!("echo #{dev}.startConnected = \\\"#{connect}\\\" >> #{vmxpath}")
      r = esxi.exec!("echo #{dev}.deviceType = \\\"cdrom-image\\\" >> #{vmxpath}")
      r = esxi.exec!("echo #{dev}.fileName = \\\"#{image}\\\" >> #{vmxpath}")
    end

    # reload vmx
    r = esxi.exec!("vim-cmd vmsvc/reload #{vmid}")

    content_type :json
    {:status => 'probably ok', :message => 'Please reboot a VM.'}.to_json
  end

  post '/api/v1/vms/:vmid/config/vnc' do

    vmid = params[:vmid]
    esxi = ESXI.instance
    summary = esxi.summary(vmid)
    if summary["config"]["vmPathName"] =~/\[([^\]]+)\]\s*(.+)/
      vmxpath = "/vmfs/volumes/" + $1 + "/" + $2
      vmdir = File.dirname(vmxpath)
    else
      halt 503
    end

    dev = 'RemoteDisplay.vnc'

    r = esxi.exec!("sed -i '/^#{dev}\\\./d' #{vmxpath}")
    if params['vnc_enable'] && params['vnc_enable'] == 'on'
      r = esxi.exec!("echo #{dev}.enabled = \\\"TRUE\\\" >> #{vmxpath}")
      r = esxi.exec!("echo #{dev}.port = \\\"#{params['vnc_port']}\\\" >> #{vmxpath}")
      r = esxi.exec!("echo #{dev}.password = \\\"#{params['vnc_passwd']}\\\" >> #{vmxpath}")
      r = esxi.exec!("echo #{dev}.keyMap = \\\"jp\\\" >> #{vmxpath}")
    end

    # reload vmx
    r = esxi.exec!("vim-cmd vmsvc/reload #{vmid}")

    content_type :json
    {:status => 'probably ok', :message => 'Please reboot a VM.'}.to_json
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

  get '/api/v1/esxi/' do
    content_type :json
    halt 400, {:status => 'error', :message => 'Not login'}.to_json unless ESXI.instance

    result = ESXI.instance.hostsummary

    {:status=> 'ok', :hostsummary => result}.to_json
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

