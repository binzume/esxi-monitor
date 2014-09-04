ESXi Monitor
================

VMware ESXiのWebインターフェイスです．


API経由ではなく，sshでESXiにログインして操作するため，無償版でも大丈夫です．
(事前に，SSH接続を許可する必要があります)

将来，vSphere Client のようなものになる予定ですが，作りかけです．

ESXi上のVMの一覧表示や，再起動などをブラウザ上からできます．

VMの削除や複製もサポートする予定です(そのうち)．


Installation
--------------

- 事前にESXiへSSHでログインできることを確認
- conf/app.jsonを編集，または環境変数ESXI_HOSTで，ESXiのホストを指定してください
- bundle install
- ruby esxi-web.rb
- sinatraのデフォルトポート(4567)で待ち受けているのでブラウザで開く

64bit Windowsで実行時している場合，ログイン時に Creation of file mapping failed with error: 998 が発生することがありますが，
pagent等を終了すると大丈夫かもしれません．


API
----

情報はjsonで取得できます．APIの仕様はコロコロ変わります．

現在の仕様は public/js下のlogin.jsやmonitor.jsを読むのが手っ取り早いです．


### GET /api/v1/esxi/status

状態を取得．CSRFのトークンもとりあえずここに入っています．

### POST /api/v1/esxi/connect

ログインして接続します．

※ログインしたSSHのコネクションはAPIにアクセスできる誰もが使える状態になります．(現状，セッション単位で管理したりはしません)


### GET /api/v1/esxi/disconnect

切断します．

### GET /api/v1/esxi/

ESXiの情報を取得します．hostsummary相当．


### GET /api/v1/vms

VM一覧を取得．


### GET /api/v1/vms/:vmid

VM情報．get.summary相当

### DELETE /api/v1/vms/:vmid

VMを削除．

イベントリから削除し，ファイルも削除します．削除すると元には戻せません．


### GETT /api/v1/vms/:vmid/power

get.runtimeのpowerState相当．

### POST /api/v1/vms/:vmid/power

電源をコントロールします．

on, off, shutdown, reboot のいずれかをリクエストのボディとして送信してください．

### POST /api/v1/vms/:vmid/copy

VMの複製をします．

この昨日は実装中で特定の構成の環境しかサポートしません．コピー先の名前とMACアドレスを指定してください．


### GET /api/v1/vms/:vmid/guest

VMのゲストの情報．get.guest相当


