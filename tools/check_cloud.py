import os, json, re

base = r'd:/Data/ai/code/chigu'
env_id = 'cloudbase-d4gsz9sx6c8d47a29'
print(f'=== 目标环境 ID: {env_id} ===\n')

# 1. project.config.json
print('--- project.config.json ---')
pconf = json.load(open(os.path.join(base,'project.config.json'), encoding='utf-8'))
print('  cloudfunctionRoot:', pconf.get('cloudfunctionRoot','MISSING'))
print('  appid:', pconf.get('appid'))

# 2. app.js env
print('\n--- app.js ---')
appjs = open(os.path.join(base,'app.js'), encoding='utf-8').read()
m = re.search(r"env:\s*['\"]([^'\"]+)['\"]", appjs)
if m:
    e = m.group(1)
    ok = 'OK' if e == env_id else 'MISMATCH'
    print(f'  env: {e}  [{ok}]')
else:
    print('  env: NOT FOUND')

# 3. 云函数文件检查
print('\n--- 云函数文件检查 ---')
cf_root = os.path.join(base,'cloudfunctions')
for fn in ['addRecord','listRecords','deleteRecord','initDBSchema']:
    d = os.path.join(cf_root, fn)
    files = {}
    for f in ['config.json','package.json','index.js']:
        fp = os.path.join(d, f)
        files[f] = os.path.exists(fp)
    status = 'OK' if all(files.values()) else 'MISSING'
    print(f'  [{status}] {fn}/  config={"y" if files["config.json"] else "n"} pkg={"y" if files["package.json"] else "n"} index={"y" if files["index.js"] else "n"}')

# 4. 语法检查
print('\n--- Node.js 语法检查 ---')
import subprocess
ok_all = True
for fn in ['addRecord','listRecords','deleteRecord','initDBSchema']:
    idx = os.path.join(cf_root, fn, 'index.js').replace('\\', '/')
    r = subprocess.run(['node','--check', idx], capture_output=True, text=True)
    status = 'OK' if r.returncode == 0 else 'ERR'
    if r.returncode != 0:
        ok_all = False
        print(f'  [ERR] {fn}/index.js: {r.stderr.strip()[:200]}')
    else:
        print(f'  [OK]  {fn}/index.js')

# 5. 云函数 COL 名一致性
print('\n--- 集合名一致性 ---')
for fn in ['addRecord','listRecords','deleteRecord']:
    idx = os.path.join(cf_root, fn, 'index.js')
    content = open(idx, encoding='utf-8').read()
    m = re.search(r"COL\s*=\s*['\"]([^'\"]+)['\"]", content)
    col = m.group(1) if m else 'NOT FOUND'
    print(f'  {fn}: COL = "{col}"')

# 6. storage.js 调用名
print('\n--- storage.js 云函数调用名 ---')
storage = open(os.path.join(base,'utils/storage.js'), encoding='utf-8').read()
fns_in_storage = re.findall(r"callFn\(['\"](\w+)['\"]", storage)
deployed = ['addRecord','listRecords','deleteRecord']
print(f'  storage.js 调用: {fns_in_storage}')
print(f'  实际部署:       {deployed}')
missing = [f for f in deployed if f not in fns_in_storage]
extra   = [f for f in fns_in_storage if f not in deployed]
if missing: print(f'  ERROR - 调了未部署: {missing}')
if extra:   print(f'  ERROR - 未部署但调用了: {extra}')
if not missing and not extra:
    print('  调用名与部署完全一致')

# 7. initDBSchema 里 ensureCollection 名
print('\n--- initDBSchema 创建集合名 ---')
idx = os.path.join(cf_root, 'initDBSchema', 'index.js')
content = open(idx, encoding='utf-8').read()
m = re.search(r"['\"](\w+)['\"].*createCollection|createCollection.*['\"](\w+)['\"]", content)
# 简单搜一下
for line in content.split('\n'):
    if 'createCollection' in line:
        print(f'  {line.strip()}')

print('\n=== 检查完成 ===')
