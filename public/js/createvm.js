var servers = [];
var apiUrl = "/api/v1/";
var token = null;
var current_vmid = null;
var click_count = 0;


function check_connected(f) {

	getJson(apiUrl + "esxi/status",function(result) {
		if (result.status=='ok') {
			if (f) {
				f(result);
			}
		}
	});
}

function disconnect() {
	getJson(apiUrl + "esxi/disconnect",function(result) {
		location.href="login.html";
	});
}

window.addEventListener('load',(function(e){


	// add nic
	document.getElementById('add_nic_button').addEventListener('click',(function(e){
		e.preventDefault();
		new Dialog(document.getElementById('add_nic_dialog')).
			onClick('add_nic_button2',function(){
    		element_append(document.getElementById("nic_list"),element('li', "NIC " + 
    		document.getElementById("nic_device").value  + "(" + document.getElementById("nic_macaddr").value ));
		    var form = document.getElementById("create_vm_form");
		    form.nic_device.value = document.getElementById("nic_device").value;
		    form.nic_static.value = document.getElementById("nic_static_addr").value;
		    form.nic_address.value = document.getElementById("nic_macaddr").value;
		}).show();
		
	}),false);

	// select os
	document.getElementById('select_os_button').addEventListener('click',(function(e){
		e.preventDefault();
		new Dialog(document.getElementById('select_os_dialog')).
			onClick('select_os_form_ok',function(){
		    var form = document.getElementById("create_vm_form");
		    form.guestos.value = document.getElementById("select_os_form").guestos.value;
		}).show();
		
	}),false);

	check_connected(function(result){
		token = result.token;
		document.getElementById("api_token").value = result.token;
		if (result.connected) {
		    document.getElementById('login_user').innerText = result.user + " : " + result.host;
		} else {
			location.href="login.html";
		}
	});

}),false);

