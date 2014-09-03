var servers = [];
var apiUrl = "/api/v1/";
var token = null;
var current_vmid = null;


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

function copy_vm(vmid, name, macaddr) {
	var xhr = getxhr();
	xhr.open('POST', apiUrl + "vms/" + vmid + "/copy");
	xhr.setRequestHeader("X-CSRFToken", token);
	xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
	xhr.onreadystatechange = function() {
		if (xhr.readyState != 4) return;
		console.log(xhr.responseText);
		alert(xhr.responseText);
	};
	xhr.send("vmid=" + vmid + "&name=" + name + "&macaddr=" + macaddr);
}


function delete_vm(vmid) {
	var xhr = getxhr();
	xhr.open('DELETE', apiUrl + "vms/" + vmid);
	xhr.setRequestHeader("X-CSRFToken", token);
	xhr.onreadystatechange = function() {
		if (xhr.readyState != 4) return;
		alert(xhr.responseText);
	};
	xhr.send();
}

function load_vms() {

	getJson(apiUrl + "vms",function(result) {
		if (result && result.status=='ok') {
			var e = document.getElementById('vm_list');
			e.innerHTML = "";
			for (var i = 0; i < result.vms.length; i++) {
				var vm = result.vms[i];
				var li = element("li",	[element('b', "" + vm.name), element('br'), "(" + vm.guest_os + ")"]);
				li.dataset.vmid = vm.id;
				li.style.cursor = 'pointer';
				(function(vm){
					li.addEventListener('click',(function(e){
						document.getElementById('vm_id').innerText = vm.id;
						document.getElementById('vm_name').innerText = vm.name;
						load_vm_data(vm.id);
            			load_vm_summary(vm.id);
					}),false);
				})(vm);
				e.appendChild(li);
			}
		} else {
			document.getElementById('error').style.display = "block";
		}
	});
}

function load_vm_data(vmid) {
	current_vmid = vmid;
	var ul = document.getElementById('vm_guest');
	ul.innerHTML = "";
	getJson(apiUrl + "vms/" + vmid + "/guest",function(result) {
		ul.innerHTML = "";
		if (result && result.status=='ok') {
			ul.appendChild(element('li', "Guset: " + result.guest.guestFamily + " / " + result.guest.guestFullName));
			ul.appendChild(element('li', "VMWare tools: " + result.guest.toolsVersion));
			ul.appendChild(element('li', "Hostname: " + result.guest.hostName));
			ul.appendChild(element('li', "IP Address: " + result.guest.ipAddress));
			if (result.guest.net && result.guest.net.length > 0) {
				ul.appendChild(element('li', "MAC Address: " + result.guest.net[0].macAddress));
			}
			ul.appendChild(element('li', ["Status: " , element('b',result.guest.guestState, {"className":(result.guest.guestState=="running"?"running":"stopped")})]));
			for (var i=0; result.guest.disk && i < result.guest.disk.length; i++) {
				ul.appendChild(element('li', "Disk: '" + result.guest.disk[i].diskPath + "' " +  result.guest.disk[i].freeSpace + "/" + result.guest.disk[i].capacity));
			}
			ul.appendChild(element('li', "Ready?: " + result.guest.guestOperationsReady));
			
		} else {
			document.getElementById('error').style.display = "block";
		}
	});
}

function load_vm_summary(vmid) {
	current_vmid = vmid;
	var ul = document.getElementById('vm_summary');
	ul.innerHTML = "";
	getJson(apiUrl + "vms/" + vmid,function(result) {
		ul.innerHTML = "";
		if (result && result.status=='ok') {
			ul.appendChild(element('li', "Status: " + result.summary.overallStatus));
			ul.appendChild(element('li', "vmPath: " + result.summary.config.vmPathName));

			ul.appendChild(element('li', "bootTime: " + result.summary.runtime.bootTime));

			ul.appendChild(element('li', "guestFullName: " + result.summary.guest.guestFullName));
			ul.appendChild(element('li', "Hostname: " + result.summary.guest.hostName));
			ul.appendChild(element('li', "IP Address: " + result.summary.guest.ipAddress));
			ul.appendChild(element('li', "VMware Tools: " + result.summary.guest.toolsRunningStatus));

		} else {
			ul.appendChild(element('li', "cannot get VM summary."));
		}
	});
}

window.addEventListener('load',(function(e){

	document.getElementById('reboot_button').addEventListener('click',(function(e){
		var vmid = document.getElementById('vm_id').innerText;
        var xhr = getxhr();
        xhr.open('POST', apiUrl + "vms/" + vmid + "/power");
		xhr.setRequestHeader("X-CSRFToken", token);
        xhr.send("reboot");
	}),false);

	document.getElementById('power_on_button').addEventListener('click',(function(e){
		var vmid = document.getElementById('vm_id').innerText;
        var xhr = getxhr();
        xhr.open('POST', apiUrl + "vms/" + vmid + "/power");
		xhr.setRequestHeader("X-CSRFToken", token);
        xhr.send("on");
	}),false);

	document.getElementById('power_off_button').addEventListener('click',(function(e){
		var vmid = document.getElementById('vm_id').innerText;
        var xhr = getxhr();
        xhr.open('POST', apiUrl + "vms/" + vmid + "/power");
		xhr.setRequestHeader("X-CSRFToken", token);
        xhr.send("off");
	}),false);

	document.getElementById('shutdown_button').addEventListener('click',(function(e){
		var vmid = document.getElementById('vm_id').innerText;
        var xhr = getxhr();
        xhr.open('POST', apiUrl + "vms/" + vmid + "/power");
		xhr.setRequestHeader("X-CSRFToken", token);
        xhr.send("shutdown");
	}),false);

	document.getElementById('dlg_power_off_button').addEventListener('click',(function(e){
		new Dialog(document.getElementById('power_off_dialog'), document.getElementById('power_off_dialog_cancel_button')).show();
	}),false);
	
	document.getElementById('refresh_button').addEventListener('click',(function(e){
		load_vms();
		if (current_vmid) {
			load_vm_data(current_vmid);
			load_vm_summary(current_vmid);
		}
	}),false);
	
	load_vms();

	check_connected(function(result){
		token = result.token;
		if (result.connected) {
		    document.getElementById('login_user').innerText = result.user + " : " + result.host;
		} else {
			location.href="login.html";
		}
	});

}),false);

