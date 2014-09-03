
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
	var self = this;
	this.elem = elem;
    this._oncancel = bindObj(this, this.oncancel);
    this.onDismissFuncs = [];
	elem.addEventListener('click', this.donothing, false);

	if (cancel) {
		cancel.addEventListener('click', this._oncancel, false);
		this.onDismissFuncs.push(function(){cancel.removeEventListener('click', self._oncancel, false)});
	}
}

Dialog.prototype.show = function() {
	this.elem.style.display = "block";
	var self = this;
	setTimeout(function() {
		document.body.addEventListener('click', self._oncancel, false);
	 }, 1);
	return this;
}

Dialog.prototype.dismiss = function() {
	this.elem.style.display = "none";
    document.body.removeEventListener('click', this._oncancel, false);
	this.elem.removeEventListener('click', this.donothing, false);
	while (this.onDismissFuncs.length > 0) {
		(this.onDismissFuncs.pop())();
	}
	return this;
}

Dialog.prototype.onClick = function(id, f) {
	var self = this;
	var e = document.getElementById(id);
	var onclick =  function(){
		self.dismiss();
		f(this, self);
	};
	e.addEventListener('click', onclick, false);
	this.onDismissFuncs.push(function(){e.removeEventListener('click', onclick, false)});

	return this;
}


Dialog.prototype.oncancel = function(e) {
    e.preventDefault();
    this.dismiss();
}

Dialog.prototype.donothing = function(e) {
    e.preventDefault();
    e.stopPropagation();
}

