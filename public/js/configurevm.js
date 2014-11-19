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

function select_vm(vmid) {
    current_vmid = vmid;
	var ee = document.getElementsByClassName("configure_vm_form");
	for (var i = 0; i < ee.length; i++) {
	    ee[i].action = ee[i].action.replace(':vmid', vmid);
	}
}

window.addEventListener('load',(function(e){


	// add nic
	document.getElementById('add_nic_button').addEventListener('click',(function(e){
		e.preventDefault();
		new Dialog(document.getElementById('add_nic_dialog')).
			onClick('add_nic_button2',function(){
    		element_append(document.getElementById("nic_list"),element('li', "NIC " + 
        		document.getElementById("nic_device").value  + "(" + document.getElementById("nic_macaddr").value ));

		    var form = document.getElementById("configure_nic_form");
		    form.nic_device.value = document.getElementById("nic_device").value;
		    form.nic_static.value = document.getElementById("nic_static_addr").value;
		    form.nic_address.value = document.getElementById("nic_macaddr").value;
		}).show();
		
	}),false);


	// select image
	document.getElementById('select_image_button').addEventListener('click',(function(e){
		e.preventDefault();
    	getJson(apiUrl + "esxi/datastore/isoimages",function(result) {
    		if (result.status=='ok') {
    		    document.getElementById("iso_list").innerHTML = "<option value=''>None</option>";
    		    for (var i = 0; i < result.images.length; i++) {
    		        var e = element('option', result.images[i]);
    		        e.value = result.images[i];
            		element_append(document.getElementById("iso_list"),e);
    		    }
    		}
    	});
		new Dialog(document.getElementById('select_iso_dialog')).onClick('select_iso_ok',function(){
		    document.getElementById("configure_cdrom_form").image.value = document.getElementById("iso_list").value;
		}).show();
		
	}),false);

	check_connected(function(result){
		token = result.token;
		var ee = document.getElementsByName("csrf_token");
		for (var i = 0; i < ee.length; i++) {
		    ee[i].value = result.token;
		}
		select_vm(33);
		if (result.connected) {
		    document.getElementById('login_user').innerText = result.user + " : " + result.host;
		} else {
			location.href="login.html";
		}
	});

	if (location.hash) {
		var vmid = location.hash.slice(1);
		if (vmid) {
    		select_vm(vmid);
		}
	}

}),false);


window.addEventListener('hashchange',(function(e){
	if (location.hash) {
		var vmid = location.hash.slice(1);
		if (vmid) {
    		select_vm(vmid);
		}
	}
}),false);

