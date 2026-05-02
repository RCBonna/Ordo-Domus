
import sys
import re

with open('c:/Users/rcbon/OneDrive/Apps/Ordo-Domus/src/OrdoDomus.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Match the history.map block
pattern = re.compile(r'\{history\.map\(\(item, idx\) => \(\s+<TableRow.*?</TableRow>\s+\)\)\}', re.DOTALL)

replacement = """{history.map((item, idx) => (
                                      <TableRow key={idx} className="border-slate-50 hover:bg-slate-50/50 transition-colors">
                                        <TableCell>
                                          <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${item.tipo === 'consumo' ? 'bg-orange-50 text-orange-500' : 'bg-green-50 text-green-500'}`}>
                                              {item.tipo === 'consumo' ? <MinusCircle className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
                                            </div>
                                            <div className="flex flex-col">
                                              <span className="font-bold text-slate-700">{item.item}</span>
                                              <span className="text-[10px] text-slate-400 font-bold uppercase">{item.categoria}</span>
                                            </div>
                                          </div>
                                        </TableCell>
                                        <TableCell className="text-sm font-medium text-slate-600">
                                          {item.comodo} <span className="text-slate-300 mx-1">•</span> {item.armario || '-'}
                                        </TableCell>
                                        <TableCell className={`text-center font-black ${item.tipo === 'consumo' ? 'text-orange-500' : 'text-primary'}`}>
                                          {item.tipo === 'consumo' ? `-1` : `+${item.quantidade}`}
                                        </TableCell>
                                      </TableRow>
                                    ))}"""

new_content = pattern.sub(replacement, content)

if new_content != content:
    with open('c:/Users/rcbon/OneDrive/Apps/Ordo-Domus/src/OrdoDomus.tsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully updated with regex!")
else:
    print("Regex match failed!")
