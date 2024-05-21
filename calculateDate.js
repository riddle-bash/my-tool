console.log('Hello')

const date = new Date()

date.setMonth(11)
date.setDate(12)
date.setHours(0, 0, 0)

const end = new Date()
end.setMonth(11)
end.setDate(12)
end.setHours(23, 59, 59)

console.log(date.toLocaleString(), end.toLocaleString())
console.log(date.getTime(), end.getTime())
