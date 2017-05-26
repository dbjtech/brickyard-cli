const alias = {}

function requireAlias(name, content) {
	if (alias[name]) {
		throw new Error(`${name} is already existent`)
	}
	alias[name] = content
}

function requirer(path) {
	const file = alias[path] || path

	if (file instanceof Object) {
		return file
	}
	return this.constructor._load(file, this) // eslint-disable-line no-underscore-dangle
}

module.constructor.prototype.require_alias = requireAlias
module.constructor.prototype.require = requirer
