import * as XLSX from 'xlsx';
import type { Database, Material } from '../domain/types';
import { stock, required } from '../domain/calculations';
export function exportRows(db: Database, materials: Material[], month: string) {
  return materials.map((m) => ({
    자재코드: m.id,
    자재명: m.name,
    재질: m.substance,
    규격: m.spec,
    단위: m.unit,
    현재재고: stock(db, m),
    계획월: month,
    '계획 필요량': required(m, db.plans[month] || {}),
    과부족: stock(db, m) - required(m, db.plans[month] || {}),
    적용모델: m.bom.map((b) => db.models.find((x) => x.id === b.modelId)?.name).join(', '),
    '소요량 검토': m.review ? '미확정' : '확정',
  }));
}
export function makeWorkbook(db: Database, materials: Material[], month: string) {
  const wb = XLSX.utils.book_new();
  const rows = exportRows(db, materials, month);
  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [], {
    header: [
      '자재코드',
      '자재명',
      '재질',
      '규격',
      '단위',
      '현재재고',
      '계획월',
      '계획 필요량',
      '과부족',
      '적용모델',
      '소요량 검토',
    ],
  });
  ws['!cols'] = [
    { wch: 12 },
    { wch: 24 },
    { wch: 15 },
    { wch: 22 },
    { wch: 8 },
    { wch: 14 },
    { wch: 12 },
    { wch: 16 },
    { wch: 14 },
    { wch: 50 },
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, '재고');
  return wb;
}
export function downloadWorkbook(db: Database, materials: Material[], month: string, name: string) {
  XLSX.writeFile(makeWorkbook(db, materials, month), name.replace(/\.xlsx$/i, '') + '.xlsx');
}
