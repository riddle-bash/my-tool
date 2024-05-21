//Sort an array based on order of other array

function mapOrder(arr, order, key) {
  const map = order.reduce((r, v, i) => ((r[v] = i), r), {})
  console.log('map:', map)
  return arr.sort((a, b) => map[a[key]] - map[b[key]])
}

const source = [
  { id: '2', label: 'Two' },
  { id: '3', label: 'Three' },
  { id: '5', label: 'Five' },
  { id: '4', label: 'Four' },
  { id: '1', label: 'One' },
]

const order = ['1', '3', '4', '5']
const result = mapOrder(source, order, `id`)

console.log(source)
console.log(result)
