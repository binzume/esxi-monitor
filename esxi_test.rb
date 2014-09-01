#!/usr/bin/env ruby
# coding: utf-8
require_relative 'esxi'
require 'json'

conf = open("conf/app.json") {|f| JSON.parse(f.read) }

puts "plz tell me a passwd --(^-^)"
pass = STDIN.gets.chomp

esxi = ESXi.new({
  :host => conf["esxi_host"],
  :user => "kawahira",
  :password => pass,
})

p esxi.parse <<"TXT"
(vim.vm.GuestInfo.DiskInfo) [
      (vim.vm.GuestInfo.DiskInfo) {
         dynamicType = <unset>,
         diskPath = "/",
         capacity = 37593112576,
         freeSpace = 32345444352,
      },
      (vim.vm.GuestInfo.DiskInfo) {
         dynamicType = <unset>,
         diskPath = "/boot",
         capacity = 507744256,
         freeSpace = 474999808,
      }
]
TXT


esxi.connect
p esxi.allvms
puts esxi.guest '10'
esxi.close

