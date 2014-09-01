var servers = [];
var apiUrl = "/api/v1/";


function check_connected(f) {

	getJson(apiUrl + "esxi/status",function(result) {
		if (result.status=='ok') {
		    f(result);
		}
	});
}


window.addEventListener('load',(function(e){


    document.getElementById("login_form").addEventListener('submit',(function(e){
        e.preventDefault();
		document.getElementById('message').innerText = "..."
        var data = new FormData(document.getElementById('login_form'));
        var xhr = getxhr();
        xhr.open('POST', apiUrl + "esxi/connect");
		xhr.onreadystatechange = function() {
			if (xhr.readyState != 4) return;
			if (xhr.status == 200) {
				r = JSON.parse(xhr.responseText);
				if (r.status == 'ok') {
					location.href="index.html";
				} else {
					document.getElementById('message').innerText = "LOGIN ERROR."
				}
			} else {
				document.getElementById('message').innerText = "HTTP ERROR."
			}
		};
        xhr.send(data);
	}),false);

    check_connected(function(r){
        document.getElementById('host_name').innerText = r.host + " " + (r.connected ? "(Connected)" : "");
    });

}),false);
