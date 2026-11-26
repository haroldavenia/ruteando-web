import { downloadBlob, downloadPdf, downloadXlsx, sheetNames } from './report-files';

describe('report-files', () => {
  describe('sheetNames', () => {
    it('quita los caracteres que Excel no admite y recorta a 31', () => {
      expect(sheetNames(['Ruta: 1/2?*[x]'])).toEqual(['Ruta 1 2 x']);
      expect(sheetNames(['a'.repeat(40)])[0].length).toBe(31);
    });

    it('nombres repetidos (sin importar mayúsculas) o vacíos se distinguen', () => {
      expect(sheetNames(['Ruta', 'ruta', 'RUTA', '', '   '])).toEqual([
        'Ruta',
        'ruta (2)',
        'RUTA (3)',
        'Hoja 4',
        'Hoja 5',
      ]);
    });

    it('el sufijo no hace pasar el nombre largo de 31 caracteres', () => {
      const long = 'x'.repeat(31);
      const names = sheetNames([long, long]);
      expect(names[1].length).toBe(31);
      expect(names[1].endsWith(' (2)')).toBeTrue();
    });
  });

  describe('fuera del navegador', () => {
    it('no descarga nada', async () => {
      expect(downloadBlob('a.txt', new Blob(['x']), 'server')).toBeFalse();
      expect(await downloadXlsx('a.xlsx', [], 'server')).toBeFalse();
      expect(
        await downloadPdf('a.pdf', { title: 't', summary: [], table: { name: 'n', header: [], rows: [] } }, 'server')
      ).toBeFalse();
    });
  });

  describe('en el navegador', () => {
    it('el libro de Excel se genera de verdad: un .xlsx es un zip y empieza por PK', async () => {
      let blob: Blob | null = null;
      const create = spyOn(URL, 'createObjectURL').and.callFake((b) => {
        blob = b as Blob;
        return 'blob:x';
      });
      spyOn(URL, 'revokeObjectURL');
      spyOn(HTMLAnchorElement.prototype, 'click');
      const done = await downloadXlsx(
        'a.xlsx',
        [{ name: 'Ruta 1', header: ['A', 'B'], rows: [['=1+1', 2]] }],
        'browser'
      );
      expect(done).toBeTrue();
      expect(create).toHaveBeenCalled();
      const bytes = new Uint8Array(await (blob as unknown as Blob).arrayBuffer());
      expect(String.fromCharCode(bytes[0], bytes[1])).toBe('PK');
    });

    it('el PDF se genera de verdad: empieza por %PDF', async () => {
      let blob: Blob | null = null;
      spyOn(URL, 'createObjectURL').and.callFake((b) => {
        blob = b as Blob;
        return 'blob:x';
      });
      spyOn(URL, 'revokeObjectURL');
      spyOn(HTMLAnchorElement.prototype, 'click');
      const done = await downloadPdf(
        'a.pdf',
        {
          title: 'Ruta',
          summary: [['Visitas:', '1']],
          table: { name: 'Ruta', header: ['A'], rows: [['x'], [null]] },
        },
        'browser'
      );
      expect(done).toBeTrue();
      const head = new TextDecoder().decode((await (blob as unknown as Blob).arrayBuffer()).slice(0, 5));
      expect(head).toBe('%PDF-');
    });
  });
});
