# React state update 규칙

## 절대 금지

- **state updater 함수 내부에서 다른 setState 호출 금지**.

  ```tsx
  // ❌ setState 안에서 다른 setState 호출
  setAchievedGoals((prev) => {
    const next = [...prev, newId];
    if (next.length === total) setShowModal(true); // ← 금지
    return next;
  });
  ```

  React 18+ StrictMode 또는 concurrent rendering에서 updater가 여러 번 호출될 수 있어 부수효과가 중복·누락된다.

## 권장

- updater는 순수 함수여야 한다 (`prev → next`만 반환).
- derived 트리거(다른 state 변경)는 `useEffect`로 분리한다.

  ```tsx
  // ✅ updater는 순수, 부수효과는 useEffect
  setAchievedGoals((prev) => [...prev, newId]);

  useEffect(() => {
    if (achievedGoals.length === total && !shownOnce) {
      setShowModal(true);
      setShownOnce(true);
    }
  }, [achievedGoals.length, total, shownOnce]);
  ```

## 출처

flyn feature 구현 중 발견. setState-in-setState 패턴이 코드리뷰에서 지적되었고, advisor도 동일 경고. 일반 규칙으로 즉시 승격.
