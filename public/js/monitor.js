var servers = [];
var apiUrl = "/api/v1/";
var token = null;


function check_connected(f) {

	getJson(apiUrl + "esxi/status",function(result) {
		if (result.status=='ok') {
			if (f) {
				f(result);
			}
		}
	});
}

function load_vm_data(vmid) {
	var ul = document.getElementById('vm_guest');
	ul.innerHTML = "";
	getJson(apiUrl + "vms/" + vmid + "/guest",function(result) {
		ul.innerHTML = "";
		if (result && result.status=='ok') {
			ul.appendChild(element('li', "Guset: " + result.guest.guestFamily + " / " + result.guest.guestFullName));
			ul.appendChild(element('li', "VMWare tools: " + result.guest.toolsVersion));
			ul.appendChild(element('li', "Hostname: " + result.guest.hostName));
			ul.appendChild(element('li', "IP Address: " + result.guest.ipAddress));
			ul.appendChild(element('li', ["Status: " , element('b',result.guest.guestState, {"className":(result.guest.guestState=="running"?"running":"stopped")})]));
			for (var i=0; i < result.guest.disk.length; i++) {
				ul.appendChild(element('li', "Disk: '" + result.guest.disk[i].diskPath + "' " +  result.guest.disk[i].freeSpace + "/" + result.guest.disk[i].capacity));
			}
			ul.appendChild(element('li', "Ready?: " + result.guest.guestOperationsReady));
			
		} else {
			document.getElementById('error').style.display = "block";
		}
	});
}

window.addEventListener('load',(function(e){

	check_connected(function(result){
		token = result.token;
		if (result.connected == false) {
			location.href="login.html";
		}
	});

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
					}),false);
				})(vm);
				e.appendChild(li);
			}
		} else {
			document.getElementById('error').style.display = "block";
		}
	});

}),false);

