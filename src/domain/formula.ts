// Recursive descent arithmetic parser. No JavaScript evaluation or property access.
export function formula(expression: string, q: number, rate: number): number {
  if (expression.length > 200) throw new Error('계산식은 200자 이내로 입력하세요.');
  const tokens = expression.match(/\d+(?:\.\d+)?|[A-Za-z_]+|[^\s]/g) || [];
  let i = 0;
  // Affine coefficients [q coefficient, constant] guarantee linearity structurally.
  type Pair = [number, number];
  const atom = (): Pair => {
    const t = tokens[i++];
    if (t === '(') {
      const n = sum();
      if (tokens[i++] !== ')') throw new Error('괄호를 확인하세요.');
      return n;
    }
    if (t === '+') return atom();
    if (t === '-') {
      const n = atom();
      return [-n[0], -n[1]];
    }
    if (t === 'q') return [1, 0];
    if (t === 'rate') return [0, rate];
    if (t && /^\d+(\.\d+)?$/.test(t)) return [0, Number(t)];
    throw new Error('숫자, q, rate, + − * /, 괄호만 지원합니다.');
  };
  const product = (): Pair => {
    let n = atom();
    while (tokens[i] === '*' || tokens[i] === '/') {
      const op = tokens[i++],
        v = atom();
      if (op === '*') {
        if (n[0] !== 0 && v[0] !== 0) throw new Error('수량(q)에 비례하는 계산식만 지원합니다.');
        n = [n[0] * v[1] + n[1] * v[0], n[1] * v[1]];
      } else {
        if (v[0] !== 0) throw new Error('수량(q)으로 나눌 수 없습니다.');
        if (v[1] === 0) throw new Error('0으로 나눌 수 없습니다.');
        n = [n[0] / v[1], n[1] / v[1]];
      }
    }
    return n;
  };
  const sum = (): Pair => {
    let n = product();
    while (tokens[i] === '+' || tokens[i] === '-') {
      const sign = tokens[i++] === '+' ? 1 : -1,
        v = product();
      n = [n[0] + sign * v[0], n[1] + sign * v[1]];
    }
    return n;
  };
  const pair = sum(),
    result = pair[0] * q + pair[1];
  if (i !== tokens.length || !Number.isFinite(result) || result < 0 || result > 1e12)
    throw new Error('계산 결과는 0 이상 1조 이하이어야 합니다.');
  return result;
}
export function validateFormula(expression: string, rates: number[]) {
  for (const r of rates) {
    if (formula(expression, 0, r) !== 0)
      throw new Error('수량(q)이 0이면 소요량도 0이어야 합니다.');
    for (const q of [1, 2, 10, 100]) {
      const v = formula(expression, q, r);
      if (Math.abs(v - formula(expression, 1, r) * q) > 1e-7)
        throw new Error('수량에 비례하는 계산식만 지원합니다. 예: q * rate');
    }
  }
}
