const { fb } = require('@brickyard/backend-app-1')

new Array(10).fill(0).forEach((e, i) => {
	fb(i)
})
