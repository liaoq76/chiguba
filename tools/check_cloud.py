import os, json, re

base = r'd:/Data/ai/code/chigu'
env_id = 'cloudbase-d4gsz9sx6c8d47a29'
print(f'=== 目标环境 ID: {env_id} ===\n')

# 1. project.config.json
print('--- project.config.json ---')
pconf = json.load(open(os.path.join(base, 'project.config.json'), encoding='utf-8'))
print('  cloudfunctionRoot:', pconf.get('cloudfunctionRoot', 'MISSING'))
print('  appid:', pconf.get('appid'))

# 2. app.js env
print('\n--- app.js ---')
appjs = open(os.path.join(base, 'app.js'), encoding='utf-8').read()
m = re.search(r"envId:\s*['\"]([^'\"]+)['\"]", appjs)
if m:
    e = m.group(1)
    ok = 'OK' if e == env_id else 'MISMATCH'
    print(f'  envId: {e}  [{ok}]')
else:
    print('  envId: NOT FOUND')

m = re.search(r"wx\.cloud\.init\(", appjs)
print(f'  wx.cloud.init: {"YES" if m else "MISSING"}')

# 3. 云函数文件检查
print('\n--- 云函数文件检查 ---')
cf_root = os.path.join(base, 'cloudfunctions')
expected = [
    'initDBSchema',
    'feedback',
    'clearAll',
    'exportAll',
    'addExpenses', 'listExpenses', 'updateExpenses', 'deleteExpenses',
    'addCollections', 'listCollections', 'updateCollections', 'deleteCollections',
    'addCollectionContributions', 'deleteCollectionContributions',
    'addPresales', 'listPresales', 'updatePresales', 'deletePresales',
    'addBudgets', 'listBudgets', 'updateBudgets',
    'addBudgetPeriods', 'listBudgetPeriods', 'updateBudgetPeriods',
    'addVocabularies', 'listVocabularies', 'updateVocabularies', 'deleteVocabularies'
]

missing = []
for fn in expected:
    d = os.path.join(cf_root, fn)
    if not os.path.exists(d):
        missing.append(fn)
        print(f'  [MISSING] {fn}/')
        continue
    files = {}
    for f in ['config.json', 'package.json', 'index.js', 'db.js']:
        fp = os.path.join(d, f)
        files[f] = os.path.exists(fp)
    status = 'OK' if all(files.values()) else 'INCOMPLETE'
    if status != 'OK':
        missing_files = [k for k, v in files.items() if not v]
        print(f'  [{status}] {fn}/  缺少: {missing_files}')
    else:
        print(f'  [{status}] {fn}/')

# 检查是否存在非法目录（_ 开头）
print('\n--- 非法目录检查 ---')
illegal = [d for d in os.listdir(cf_root) if d.startswith('_')]
if illegal:
    print(f'  ERROR: 发现以下非法目录（_ 开头）：{illegal}')
else:
    print('  无 _ 开头的目录 [OK]')

# 4. 语法检查
print('\n--- Node.js 语法检查 ---')
try:
    import subprocess
    err_count = 0
    for fn in expected:
        idx = os.path.join(cf_root, fn, 'index.js').replace('\\', '/')
        if not os.path.exists(idx):
            continue
        r = subprocess.run(['node', '--check', idx], capture_output=True, text=True)
        if r.returncode != 0:
            err_count += 1
            print(f'  [ERR] {fn}/index.js: {r.stderr.strip()[:200]}')
    if err_count == 0:
        print(f'  全部 {len(expected)} 个云函数语法检查通过 [OK]')
except FileNotFoundError:
    print('  Node.js 未安装，跳过语法检查')

# 5. sync.js 调用名一致性
print('\n--- sync.js 云函数调用名 ---')
sync_content = open(os.path.join(base, 'utils/sync.js'), encoding='utf-8').read()
m = re.search(r"COLLECTION_MAP\s*=\s*\{([^}]+)\}", sync_content, re.DOTALL)
if m:
    types = re.findall(r"^\s*(\w+):", m.group(1), re.MULTILINE)
    print(f'  sync.js COLLECTION_MAP types: {types}')

# 6. initDBSchema 集合名
print('\n--- initDBSchema 集合名 ---')
idx = os.path.join(cf_root, 'initDBSchema', 'index.js')
content = open(idx, encoding='utf-8').read()
m = re.search(r"COLLECTIONS\s*=\s*\[([^\]]+)\]", content, re.DOTALL)
if m:
    cols = re.findall(r"['\"](\w+)['\"]", m.group(1))
    print(f'  将创建 {len(cols)} 个集合: {cols}')

print('\n=== 检查完成 ===')
