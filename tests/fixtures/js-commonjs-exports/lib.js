function internalDead() {
	return "private, never called";
}

function internalUsed() {
	return "used by exported";
}

exports.publicApi = function () {
	return internalUsed();
};

exports.neverCalledExport = function () {
	return "exported but never imported anywhere";
};
