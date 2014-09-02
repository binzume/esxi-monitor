ESXi Monitor
================

VMware ESXiのWebインターフェイスです．


API経由ではなく，sshでESXiにログインして操作するため，無償版でも大丈夫です．
(事前に，SSH接続を許可する必要があります)

将来，vSphere Client のようなものになる予定ですが，作りかけです．

ESXi上のVMの一覧表示や，再起動などをブラウザ上からできます．

VMの削除や複製もサポートする予定です(そのうち)．


API
----

情報はjsonで取得できます．細かい仕様は public/js下のlogin.jsやmonitor.jsを読むのが手っ取り早いです．

### GET /api/v1/esxi/status

状態を取得．CSRFのトークンもとりあえずここに入っています．

### POST /api/v1/esxi/connect

ログインして接続します．

※ログインしたSSHのコネクションはAPIにアクセスできる誰もが使える状態になります．(現状，セッション単位で管理したりはしません)


### GET /api/v1/esxi/disconnect

切断します．


### GET /api/v1/vms

VM一覧を取得．


### GET /api/v1/vms/:vmid

VM情報．get.summary相当

### DELETE /api/v1/vms/:vmid

VMを削除

### POST /api/v1/vms/:vmid/power

電源をコントロールします．

on, off, shutdown, reboot のいずれかをリクエストのボディとして送信してください．

### POST /api/v1/vms/:vmid/copy

実装中です．VMの複製をします．


### GET /api/v1/vms/:vmid/guest

VMのゲストの情報．get.guest相当


