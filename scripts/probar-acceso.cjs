const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const demo = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/mocks/estadia.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: demo, Date, require: () => ({ getAccount: async () => ({ reservation: 'FINALIZADA' }) }) });
const { requestDemoCode, verifyDemoCode, closeDemoSession, isDemoSession } = demo;
const now = 1000000;
assert.equal(requestDemoCode('nadie@example.com', now), requestDemoCode('ana@example.com', now));
assert.throws(() => verifyDemoCode('123456', now + 600000), /venció/);
requestDemoCode('ana@example.com', now);
assert.equal(verifyDemoCode('123456', now + 1000), 'actual');
assert.equal(isDemoSession(), true);
assert.throws(() => verifyDemoCode('123456', now + 2000), /usado/);
closeDemoSession(); assert.equal(isDemoSession(), false);
requestDemoCode('ana@example.com', now);
for (let i = 0; i < 4; i++) assert.throws(() => verifyDemoCode('000000', now + 1000), /no es válido/);
assert.throws(() => verifyDemoCode('000000', now + 1000), /15 minutos/);
assert.throws(() => requestDemoCode('ana@example.com', now + 2000), /15 minutos/);
assert.throws(() => verifyDemoCode('123456', now + 2000), /15 minutos/);
requestDemoCode('ana@example.com', now + 901001);
assert.equal(verifyDemoCode('123456', now + 901002), 'actual');
console.log('OK: demo OTP, vencimiento, uso único, bloqueo y cierre de sesión.');

demo.getStays().then(values => { assert.equal(values[0].status, 'FINALIZADA'); assert.equal(values[1].status, 'CONFIRMADA'); console.log('OK: reservas reflejan el check-out.'); }).catch(error => { console.error(error); process.exitCode = 1; });

for (let i = 0; i < 4; i++) { requestDemoCode('ana@example.com', now + 2000000); assert.throws(() => verifyDemoCode('000000', now + 2000001), /no es válido/); }
requestDemoCode('ana@example.com', now + 2000000);
assert.throws(() => verifyDemoCode('000000', now + 2000001), /15 minutos/);
requestDemoCode('otro@example.com', now + 2000002);
assert.throws(() => requestDemoCode('ana@example.com', now + 2000003), /15 minutos/);
console.log('OK: reenviar o cambiar correo no reinicia el bloqueo.');
