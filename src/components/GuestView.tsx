import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Package, Search, MapPin, Loader2 } from 'lucide-react';
import type { InventoryItem } from '../types/domain';
import { logger } from '../lib/logger';

interface Props {
  unidadeId: string;
}

export default function GuestView({ unidadeId }: Props) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let isMounted = true;
    const carregarItens = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('itens_inventario')
        .select('*')
        .eq('unidade_id', unidadeId)
        .order('categoria', { ascending: true });
        
      if (error) {
        logger.warn('Falha ao carregar itens para convidado.');
      } else if (isMounted && data) {
        setItems(data);
      }
      if (isMounted) setLoading(false);
    };

    if (unidadeId) carregarItens();

    return () => { isMounted = false; };
  }, [unidadeId]);

  const filteredItems = items.filter(i => 
    i.nome?.toLowerCase().includes(search.toLowerCase()) ||
    i.categoria?.toLowerCase().includes(search.toLowerCase()) ||
    i.comodo?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card className="border-none shadow-sm rounded-[24px] h-[75vh] flex flex-col mt-4">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          Inventário da Casa
        </CardTitle>
        <CardDescription>
          Filtre os itens para achar exatamente onde foram guardados. (Acesso de Leitura)
        </CardDescription>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por leite, garagem, comida..." 
            className="pl-9 h-10 rounded-xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-primary opacity-50" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-6 text-center">
             <Package className="w-12 h-12 mb-4 opacity-20" />
             <p>Nenhum item encontrado.</p>
          </div>
        ) : (
          <ScrollArea className="h-full w-full rounded-b-[24px]">
            <Table>
              <TableHeader className="bg-gray-50/80 sticky top-0 backdrop-blur-sm z-10">
                <TableRow className="hover:bg-transparent border-gray-100">
                  <TableHead className="font-medium">O que é</TableHead>
                  <TableHead className="font-medium">Onde está</TableHead>
                  <TableHead className="font-medium">Quantidade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map(item => (
                  <TableRow key={item.id} className="border-gray-100">
                    <TableCell className="font-medium max-w-[200px]">
                      <div className="flex flex-col">
                        <span>{item.nome}</span>
                        {item.categoria && <Badge variant="secondary" className="w-max mt-1 text-[10px]">{item.categoria}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm text-muted-foreground">
                        <span className="font-medium text-black flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {item.comodo}
                        </span>
                        {([item.armario, item.caixa].filter(Boolean).length > 0) && (
                           <span className="text-xs ml-4">↳ {[item.armario, item.caixa].filter(Boolean).join(' - ')}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">{item.quantidade}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
