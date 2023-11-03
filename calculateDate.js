console.log('Hello')

const date = new Date()

date.setMonth(10)
date.setDate(30)
date.setHours(23, 59, 59)

console.log(date.toLocaleString())
console.log(date.getTime())
