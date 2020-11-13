const fb = (n) => (n < 2 ? n : fb(n - 1) + fb(n - 2))

module.exports = { fb }
