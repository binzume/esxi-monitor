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
	load_vm_data(vmid);
	load_vm_summary(vmid);
}


function power_ctl_vm(vmid, state) {
	document.getElementById('error').style.display = "none";
	var r = document.getElementById('succeeded');
	r.style.display = "none";
	var xhr = requestJson('POST', apiUrl + "vms/" + vmid + "/power");
	xhr.setRequestHeader("X-CSRFToken", token, function(result) {
		ul.innerHTML = "";
		if (result && result.status=='ok') {
			r.innerHTML = "OK";
			r.style.display = "block";
		} else {
			document.getElementById('error').style.display = "block";
		}
	});
	xhr.send(state);
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
						document.getElementById('vm_name').innerText = vm.name;
            			location.href="#" + vm.id;
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
	document.getElementById('vm_id').innerText = vmid;
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

function progbar(parcent) {
	var prog = element('div');
	var bar = element('div', prog);
	prog.style.width = ""+ parcent + "%" 
	prog.style.height = "8pt" 
	prog.style.backgroundColor="#ff0000";
	bar.style.width = "100pt" 
	bar.style.height = "8pt" 
	bar.style.backgroundColor="#00aa00";
	bar.style.display = "inline-block"
	return bar;
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
			ul.appendChild(element('li', ["Memory: " + result.summary.config.memorySizeMB + "MB ",  progbar( result.summary.quickStats.guestMemoryUsage / result.summary.runtime.maxMemoryUsage * 100 )]));
			ul.appendChild(element('li', ["CPUs: " + result.summary.config.numCpu, progbar( result.summary.quickStats.overallCpuUsage / result.summary.runtime.maxCpuUsage * 100 )]));

			ul.appendChild(element('li', "Power: " + result.summary.runtime.powerState));
			ul.appendChild(element('li', "Boot time: " + result.summary.runtime.bootTime));
			ul.appendChild(element('li', "uptime: " + result.summary.quickStats.uptimeSeconds + "sec."));

			ul.appendChild(element('li', "guestFullName: " + result.summary.guest.guestFullName));
			ul.appendChild(element('li', "Hostname: " + result.summary.guest.hostName));
			ul.appendChild(element('li', "IP Address: " + result.summary.guest.ipAddress));
			ul.appendChild(element('li', "VMware Tools: " + result.summary.guest.toolsRunningStatus));
			
			document.getElementById('power_on_button').disabled = (result.summary.runtime.powerState == "poweredOn");
			document.getElementById('dlg_power_off_button').disabled = (result.summary.runtime.powerState == "poweredOff");
			document.getElementById('reboot_button').disabled = (result.summary.runtime.powerState == "poweredOff");

			document.getElementById('copy_vm_button').disabled = (result.summary.runtime.powerState == "poweredOn");
			document.getElementById('delete_vm_button').disabled = (result.summary.runtime.powerState == "poweredOn");


		} else {
			ul.appendChild(element('li', "cannot get VM summary."));
		}
	});
}

window.addEventListener('load',(function(e){

	document.getElementById('reboot_button').addEventListener('click',(function(e){
		power_ctl_vm(current_vmid, "reboot");
	}),false);

	document.getElementById('power_on_button').addEventListener('click',(function(e){
		power_ctl_vm(current_vmid, "on");
	}),false);

	// shutdown or power off
	document.getElementById('dlg_power_off_button').addEventListener('click',(function(e){
		new Dialog(document.getElementById('power_off_dialog'), document.getElementById('power_off_dialog_cancel_button')
		).onClick('power_off_button',function(){
			power_ctl_vm(current_vmid, "off");
		}).onClick('shutdown_button',function(){
			power_ctl_vm(current_vmid, "shutdown");
		}).show();

	}),false);

	// delete
	document.getElementById('delete_vm_button').addEventListener('click',(function(e){
		document.getElementById('delete_vm_dialog').getElementsByClassName('vm_name')[0].innerText = current_vmid;
		new Dialog(document.getElementById('delete_vm_dialog'), document.getElementById('delete_vm_dialog_cancel_button')).
			onClick('confirm_delete_vm_button',function(){
				delete_vm(current_vmid);
		}).show();
	}),false);

	// copy
	document.getElementById('copy_vm_button').addEventListener('click',(function(e){
		document.getElementById('copy_vm_dialog').getElementsByClassName('vm_name')[0].innerText = current_vmid;
		new Dialog(document.getElementById('copy_vm_dialog'), document.getElementById('copy_vm_dialog_cancel_button')).
			onClick('confirm_copy_vm_button',function(){
				copy_vm(current_vmid, document.getElementById('copy_vm_name').value, document.getElementById('copy_vm_macaddr').value);
		}).show();
	}),false);


	document.getElementById('refresh_button').addEventListener('click',(function(e){
		load_vms();
		if (current_vmid) {
			load_vm_data(current_vmid);
			load_vm_summary(current_vmid);
		}
	}),false);
	
	document.getElementById('manage_vm_button').addEventListener('click',(function(e){
		// show hidden functions...
		document.getElementById('copy_vm_button').style.display = "block";
		document.getElementById('delete_vm_button').style.display = "block";
		document.getElementById('config_vm_button').style.display = "block";
	}),false);

	document.getElementById('config_vm_button').addEventListener('click',(function(e){
	    location.href="configurevm.html#" + current_vmid;
	}),false);
	
	load_vms();

	if (location.hash) {
		var vmid = location.hash.slice(1);
		if (vmid) {
			load_vm_data(vmid);
			load_vm_summary(vmid);
		}
	}

	check_connected(function(result){
		token = result.token;
		if (result.connected) {
		    document.getElementById('login_user').innerText = result.user + " : " + result.host;
		} else {
			location.href="login.html";
		}
	});

}),false);


window.addEventListener('hashchange',(function(e){
	if (location.hash) {
		var vmid = location.hash.slice(1);
		if (vmid) {
			select_vm(vmid);
		}
	}
}),false);
