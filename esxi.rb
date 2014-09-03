# coding: utf-8

require 'net/ssh'
require 'thread'

class ESXi
  attr_reader :ssh

  def initialize opts
    @opts = opts
    @m = Mutex.new
  end

  def host
    @opts[:host]
  end

  def user
    @opts[:user]
  end

  def connect
    @m.synchronize {
      @ssh = Net::SSH.start(@opts[:host], @opts[:user], {:password => @opts[:password]})
    }
  end

  def allvms
    exec!('vim-cmd vmsvc/getallvms').lines[1..-1].map{|v|
      Hash[*[:id, :name, :file, :guest_os, :version, :annotation].zip(v.split(/\s\s+/)).flatten]
    }
  end

  def summary vmid
    result = exec!('vim-cmd vmsvc/get.summary ' + vmid)
    parse(result.sub(/\A[^(]+/,''))
  end

  def config vmid
    result = exec!('vim-cmd vmsvc/get.config ' + vmid)
    parse(result.sub(/\A[^(]+/,''))
  end

  def guest vmid
    result = exec!('vim-cmd vmsvc/get.guest ' + vmid)
    parse(result.sub(/\A[^(]+/,''))
  end

  def runtime vmid
    result = exec!('vim-cmd vmsvc/get.runtime ' + vmid)
    parse(result.sub(/\A[^(]+/,''))
  end

  def power_off vmid
    exec!('vim-cmd vmsvc/power.off ' + vmid)
  end

  def power_on vmid
    exec!('vim-cmd vmsvc/power.on ' + vmid)
  end

  def power_on_with_answer vmid, ans = 2
    t = Thread.new do
      sleep(3)
      self.fork {|conn|
        10.times do
          r = conn.exec!('vim-cmd vmsvc/message ' + vmid)
          puts r
          if r =~/^Virtual machine message\s*([^\s:]+):/
            puts $1
            puts conn.exec!("vim-cmd vmsvc/message #{vmid} #{$1} #{ans}")
            break
          end
          sleep(2)
        end
      }
    end
    ret = power_on(vmid)
    t.terminate
    ret
  end

  def reboot vmid
    exec!('vim-cmd vmsvc/power.reboot ' + vmid)
  end

  def shutdown vmid
    exec!('vim-cmd vmsvc/power.shutdown ' + vmid)
  end

  def destroy! vmid
    exec!('vim-cmd vmsvc/destroy ' + vmid)
  end

  def vm_message vmid
    exec!('vim-cmd vmsvc/message' + vmid)
  end

  def close
    @ssh.close if @ssh
    @ssh = nil
  end

  def parse_obj str, type
    r = {:_type => type}
    while !(str=~/\A\s*\}/) do
      str.sub!(/\A\s*(\w+)\s*=\s*/,'')
      r[$1] = parse(str)
      str.sub!(/\A\s+/,'')
      str.sub!(/\A\s*,\s*/,'')
    end
    str.sub!(/\A\s*\}/,'')
    r
  end

  def parse_array str, type
    r = []
    while !(str=~/\A\s*\]/) do
      r << parse(str)
      str.sub!(/\A\s+/,'')
      str.sub!(/\A\s*,\s*/,'')
    end
    str.sub!(/\A\s*\]/,'')
    r
  end

  def exec!(command)
    @m.synchronize {
      @ssh.exec!(command)
    }
  end

  def fork &block
    conn = ESXi.new(@opts)
    if block
      begin
        puts "connecting..."
        conn.connect
        block.call(conn)
      ensure
        conn.close
      end
    else
      conn
    end
  end

  def parse str
    str.sub!(/\A\s+/,'')
    if str.sub!(/\A\(([^)]+)\)\s*\{/, '')
      parse_obj str, $1
    elsif str.sub!(/\A\(([^)]+)\)\s*\[/, '')
      parse_array str, $1
    elsif str.sub!(/\A\(([^)]+)\)\s*null/, '')
      nil
    elsif str.sub!(/\Atrue/, '')
      true
    elsif str.sub!(/\Afalse/, '')
      false
    elsif str.sub!(/\A(\d+)/, '')
      $1.to_i
    elsif str.sub!(/\A<unset>/, '')
      nil
    elsif str.sub!(/\A(['"])(.*?)\1/, '')
      $2
    elsif str.sub!(/\A(.)/,'')
      'PARSE_ERR'
    end
  end
end

