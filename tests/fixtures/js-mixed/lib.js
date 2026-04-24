function deadJsFunction() {
	return "dead";
}

var deadVar = function () {
	return "also dead";
};

const usedConst = () => {
	return "used";
};

module.exports = { usedConst };
