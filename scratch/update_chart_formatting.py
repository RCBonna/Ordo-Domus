import re
import os

path = r'c:\Users\rcbon\OneDrive\Apps\Ordo-Domus\src\OrdoDomus.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update BarChart data mapping
old_bar_data = """                                    data={Object.entries(
                                      fullInventory.reduce((acc: any, item: any) => {
                                        const comodo = item.comodo || 'Outros';
                                        acc[comodo] = (acc[comodo] || 0) + (item.quantidade || 0);
                                        return acc;
                                      }, {})
                                    ).map(([name, total]) => ({ name, total }))}"""

new_bar_data = """                                    data={Object.entries(
                                      fullInventory.reduce((acc: any, item: any) => {
                                        const comodo = formatarTexto(item.comodo) || 'Outros';
                                        acc[comodo] = (acc[comodo] || 0) + (item.quantidade || 0);
                                        return acc;
                                      }, {})
                                    ).map(([name, total]) => ({ name, total }))}"""

content = content.replace(old_bar_data, new_bar_data)

# 2. Update BarChart Cell mapping (inside Bar)
old_bar_cells = """                                      {Object.entries(
                                        fullInventory.reduce((acc: any, item: any) => {
                                          const comodo = item.comodo || 'Outros';
                                          acc[comodo] = (acc[comodo] || 0) + (item.quantidade || 0);
                                          return acc;
                                        }, {})
                                      ).map((_, index) => ("""

new_bar_cells = """                                      {Object.entries(
                                        fullInventory.reduce((acc: any, item: any) => {
                                          const comodo = formatarTexto(item.comodo) || 'Outros';
                                          acc[comodo] = (acc[comodo] || 0) + (item.quantidade || 0);
                                          return acc;
                                        }, {})
                                      ).map((_, index) => ("""

content = content.replace(old_bar_cells, new_bar_cells)

# 3. Update PieChart data mapping
old_pie_data = """                                      data={Object.entries(
                                        fullInventory.reduce((acc: any, item: any) => {
                                          const cat = item.categoria || 'Geral';
                                          acc[cat] = (acc[cat] || 0) + (item.quantidade || 0);
                                          return acc;
                                        }, {})
                                      ).map(([name, value]) => ({ name, value }))}"""

new_pie_data = """                                      data={Object.entries(
                                        fullInventory.reduce((acc: any, item: any) => {
                                          const cat = formatarTexto(item.categoria) || 'Geral';
                                          acc[cat] = (acc[cat] || 0) + (item.quantidade || 0);
                                          return acc;
                                        }, {})
                                      ).map(([name, value]) => ({ name, value }))}"""

content = content.replace(old_pie_data, new_pie_data)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Formatting updated in charts")
