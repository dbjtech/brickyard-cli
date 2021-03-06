module.exports = class BrickyardArray extends Array {
	constructor() {
		super()
		this.frontend = {}
		this.backend = {}
		this.plan = {}
		this.buildtask = {}
		this.unknow = {}
	}

	push(...args) {
		super.push(...args)
		args.forEach((arg) => { this[arg.type][arg.name] = arg })
	}

	pushUnique(...args) {
		args.forEach((arg) => {
			if (!this[arg.type][arg.name]) {
				super.push(arg)
				this[arg.type][arg.name] = arg
			}
		})
	}
}
