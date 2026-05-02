import re
import os

path = r'c:\Users\rcbon\OneDrive\Apps\Ordo-Domus\src\OrdoDomus.tsx'
if not os.path.exists(path):
    print("File not found")
    exit(1)

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Update margin
content = content.replace('margin={{ left: 20, right: 30, top: 0, bottom: 0 }}', 'margin={{ left: 20, right: 40, top: 0, bottom: 0 }}')

# Update Bar with colors and labels
# We use a more flexible regex to match the Bar component
bar_pattern = r'<Bar\s+dataKey="total"\s+fill="#6366f1"\s+radius=\{\[0, 8, 8, 0\]\}\s+barSize=\{24\}\s*/>'
new_bar = """<Bar dataKey="total" radius={[0, 8, 8, 0]} barSize={24}>
                                      {Object.entries(
                                        fullInventory.reduce((acc: any, item: any) => {
                                          const comodo = item.comodo || 'Outros';
                                          acc[comodo] = (acc[comodo] || 0) + (item.quantidade || 0);
                                          return acc;
                                        }, {})
                                      ).map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={['#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899'][index % 7]} />
                                      ))}
                                      <LabelList dataKey="total" position="right" style={{ fill: '#64748b', fontSize: 12, fontWeight: 800 }} offset={10} />
                                    </Bar>"""

if re.search(bar_pattern, content):
    content = re.sub(bar_pattern, new_bar, content)
    print("Updated Bar successfully")
else:
    print("Bar pattern not found")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Process finished")
