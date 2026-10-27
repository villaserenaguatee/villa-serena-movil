// NIT guatemalteco: módulo 11 sobre los dígitos; el verificador puede ser K. No consulta el registro de la SAT.
export function validarNit(input: string) {
  const value = input.trim().toUpperCase().replace(/-/g, '');
  if (value.length > 12 || !/^\d+[\dK]$/.test(value)) return false;
  const digits = value.slice(0, -1);
  if (!/[1-9]/.test(digits)) return false;
  const sum = [...digits].reverse().reduce((total, digit, i) => total + Number(digit) * (i + 2), 0);
  const remainder = (11 - sum % 11) % 11;
  return value.at(-1) === (remainder === 10 ? 'K' : String(remainder));
}

// Formato del contrato (`CompradorFactura.nit`): CF o dígitos con guion opcional antes del verificador.
export function normalizarNit(input: string) { return input.trim().toUpperCase().replace(/\s+/g, ''); }
