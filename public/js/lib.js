
function getxhr() {
	var xhr;
	if(window.XMLHttpRequest) {
		xhr =  new XMLHttpRequest();
	} else if(window.ActiveXObject) {
		try {
			xhr = new ActiveXObject('Msxml2.XMLHTTP');
		} catch (e) {
			xhr = new ActiveXObject('Microsoft.XMLHTTP');
		}
	}
	return xhr;
}

function getJson(url,f){
	var xhr = getxhr();
	xhr.open('GET', url);
	xhr.onreadystatechange = function() {
		if (xhr.readyState != 4) return;
		if (f) {
			if (xhr.status == 200) {
				f(JSON.parse(xhr.responseText))
			} else {
				f(undefined)
			}
		}
	};
	xhr.send();
}

function element_append(e, value) {
	if (typeof value == 'string') {
		value = document.createTextNode(value);
		// e.innerHTML = value;
	}
	e.appendChild(value);
}
function element(tag, values, attr) {
	var e = document.createElement(tag);
	if (values instanceof Array) {
		for (var i = 0; i < values.length; i++) {
			element_append(e, values[i]);
		}
	} else if (values) {
		element_append(e, values);
	}
	if (typeof(attr) == "function") {
		attr(e);
	} else if (typeof(attr) == "object") {
		for (var key in attr) {
			e[key] = attr[key];
		}
	}
	return e;
}


function bindObj(o, f) {
	return function() {return f.apply(o, arguments)};
}


function Dialog(elem, cancel) {
	this.elem = elem;
    this._oncancel = bindObj(this, this.oncancel);

	if (cancel) {
		cancel.addEventListener('click', this._oncancel,false);
	}
}

Dialog.prototype.show = function() {
	this.elem.style.display = "block";
	var f = this._oncancel;
	setTimeout(function() {
		document.body.addEventListener('click', f, false);
	 }, 1);
	return this;
}

Dialog.prototype.dismiss = function() {
	this.elem.style.display = "none";
    document.body.removeEventListener('click', this._oncancel, false);
	return this;
}


Dialog.prototype.oncancel = function(e) {
    e.preventDefault();
    this.dismiss();
}


