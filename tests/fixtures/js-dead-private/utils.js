function deadHelper() {
	return "never called";
}

function usedHelper() {
	return "called";
}

module.exports = { usedHelper };
