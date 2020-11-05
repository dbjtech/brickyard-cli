const { fb } = require('@brickyard/backend-app-1')
require('should')

describe('fb test', () => {
	it('1 - 10', () => {
		const expects = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]
		new Array(10).fill(0).forEach((e, i) => {
			fb(i).should.be.equal(expects[i])
		})
	})
})
