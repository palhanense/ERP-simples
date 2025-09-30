from time import perf_counter
from passlib.context import CryptContext

# moderate params: time=2, memory=65536 KiB (64MB), parallelism=1
ctx = CryptContext(schemes=["argon2"], argon2__time_cost=2, argon2__memory_cost=65536, argon2__parallelism=1)
reps = 3
times = []
for i in range(reps):
    t0 = perf_counter()
    h = ctx.hash('senha-de-teste-123')
    t1 = perf_counter()
    dt = t1 - t0
    print(f"run {i+1}: {dt:.3f}s")
    times.append(dt)
print('avg:', sum(times)/len(times))
