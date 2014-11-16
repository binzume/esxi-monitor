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

function load_host_summary() {
	var ul = document.getElementById('host_summary');
	ul.innerHTML = "";
	getJson(apiUrl + "esxi/", function(result) {
		ul.innerHTML = "";
		if (result && result.status=='ok') {
			ul.appendChild(element('li', "Status: " + result.hostsummary.overallStatus));
			ul.appendChild(element('li', "CPU: " + result.hostsummary.hardware.cpuModel ));
			ul.appendChild(element('li', "CPU Cores: " + result.hostsummary.hardware.numCpuCores + " (" + result.hostsummary.hardware.numCpuThreads + "threads)" ));
			ul.appendChild(element('li', ["CPU Speed: " + result.hostsummary.hardware.cpuMhz + "MHz (" + result.hostsummary.quickStats.overallCpuUsage  + "MHz used) ",
				 progbar( result.hostsummary.quickStats.overallCpuUsage / result.hostsummary.hardware.cpuMhz / result.hostsummary.hardware.numCpuThreads * 100 )] ));
			ul.appendChild(element('li', ["Memory: " + result.hostsummary.hardware.memorySize + "B ",
				progbar( result.hostsummary.quickStats.overallMemoryUsage / result.hostsummary.hardware.memorySize * (1024*1024) * 100 )]));
			ul.appendChild(element('li', "Power: " + result.hostsummary.runtime.powerState));
			ul.appendChild(element('li', "Boot time: " + result.hostsummary.runtime.bootTime));
			ul.appendChild(element('li', "uptime: " + result.hostsummary.quickStats.uptime + "sec."));
			ul.appendChild(element('li', "inMaintenanceMode: " + result.hostsummary.runtime.inMaintenanceMode));

			document.getElementById('host_name').innerHTML = result.hostsummary.config.name;
		} else {
			ul.appendChild(element('li', "cannot get Host summary."));
		}
	});
}

window.addEventListener('load',(function(e){


	load_host_summary();

	check_connected(function(result){
		token = result.token;
		if (result.connected) {
		    document.getElementById('login_user').innerText = result.user + " : " + result.host;
		} else {
			location.href="login.html";
		}
	});

}),false);

