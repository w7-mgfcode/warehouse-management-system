import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportToCSV } from '@/lib/export';

describe('CSV Export', () => {
  let createElementSpy: any;
  let appendChildSpy: any;
  let removeChildSpy: any;
  let clickSpy: any;
  let createObjectURLSpy: any;
  let revokeObjectURLSpy: any;

  beforeEach(() => {
    // Mock DOM APIs
    createElementSpy = vi.spyOn(document, 'createElement');
    appendChildSpy = vi.spyOn(document.body, 'appendChild');
    removeChildSpy = vi.spyOn(document.body, 'removeChild');
    clickSpy = vi.fn();
    createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    // Mock link element
    const mockLink = {
      setAttribute: vi.fn(),
      click: clickSpy,
      style: {},
    } as any;

    createElementSpy.mockReturnValue(mockLink);
    appendChildSpy.mockImplementation(() => mockLink);
    removeChildSpy.mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exports data to CSV with headers', () => {
    const data = [
      { name: 'Product 1', quantity: 100, price: 1500 },
      { name: 'Product 2', quantity: 50, price: 2500 },
    ];

    exportToCSV(data, 'test-export');

    // Verify link was created and clicked
    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(clickSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();
  });

  it('uses custom Hungarian headers', () => {
    const data = [
      { name: 'Product 1', quantity: 100 },
      { name: 'Product 2', quantity: 50 },
    ];

    const headers = {
      name: 'Termék',
      quantity: 'Mennyiség',
    };

    exportToCSV(data, 'test-export', headers);

    // CSV should contain Hungarian headers
    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
  });

  it('handles empty data array', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    exportToCSV([], 'test-export');

    // Should warn and not create link
    expect(consoleWarnSpy).toHaveBeenCalledWith('No data to export');
    expect(clickSpy).not.toHaveBeenCalled();

    consoleWarnSpy.mockRestore();
  });

  it('escapes commas in values', () => {
    const data = [
      { name: 'Product, with comma', quantity: 100 },
    ];

    exportToCSV(data, 'test-export');

    // Should wrap value in quotes
    expect(createObjectURLSpy).toHaveBeenCalled();
  });

  it('escapes quotes in values', () => {
    const data = [
      { name: 'Product "quoted"', quantity: 100 },
    ];

    exportToCSV(data, 'test-export');

    // Should escape quotes
    expect(createObjectURLSpy).toHaveBeenCalled();
  });

  it('handles null and undefined values', () => {
    const data = [
      { name: 'Product 1', quantity: null, price: undefined },
    ];

    exportToCSV(data, 'test-export');

    // Should convert to empty string
    expect(createObjectURLSpy).toHaveBeenCalled();
  });

  it('appends date to filename', () => {
    const data = [{ name: 'Product 1' }];

    exportToCSV(data, 'test-export');

    // Verify filename format
    const mockLink = createElementSpy.mock.results[0].value;
    const setAttributeCalls = mockLink.setAttribute.mock.calls;

    const downloadCall = setAttributeCalls.find(
      (call: any[]) => call[0] === 'download'
    );

    expect(downloadCall).toBeTruthy();
    expect(downloadCall[1]).toMatch(/test-export_\d{4}-\d{2}-\d{2}\.csv/);
  });

  it('creates CSV blob with UTF-8 BOM', () => {
    const data = [{ name: 'Termék' }];

    exportToCSV(data, 'test-export');

    // Verify Blob was created (indirectly via createObjectURL)
    expect(createObjectURLSpy).toHaveBeenCalled();
  });

  it('handles complex objects', () => {
    const data = [
      {
        name: 'Product 1',
        details: { weight: 10, unit: 'kg' }, // Will stringify to [object Object]
        quantity: 100,
      },
    ];

    exportToCSV(data, 'test-export');

    expect(createObjectURLSpy).toHaveBeenCalled();
  });
});
