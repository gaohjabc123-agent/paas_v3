import { spawnSync } from 'node:child_process';
const run = (cmd) => { const r = spawnSync(cmd, { shell: true, stdio: 'inherit' }); if (r.status !== 0) process.exit(r.status ?? 1); };
run('npm test');
run('npm run build');
run('npm run check:leaks');
console.log('\n✔ CI 通过：测试 / 构建 / 泄露扫描');
