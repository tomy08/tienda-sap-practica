import 'tsx/esm'
const mod = await import('@sap/cds')
console.log('namespace keys:', Object.keys(mod))
console.log('default === module.exports?', mod.default)
console.log('log:', typeof mod.default?.log)
console.log('resolved:', import.meta.resolve('@sap/cds'))
