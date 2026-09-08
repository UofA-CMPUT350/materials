# Lab 2 Exercise

**Author: Daniel Cui**

> [!WARNING]
> Due: September 8th 2026, 11:30pm

> [!IMPORTANT]
> <RepoCard repo="UofA-CMPUT350/lab-2-exercise"></RepoCard>
> Click `Use this template` button to create your repo based on it  
> Make sure you are able to compile and run the binary using the following commands
> ```shell
> # In `lab-2-exercise` folder
> cmake --preset debug # On lab machine, use `cmake -S . -B build` instead
> cmake --build build
> chmod u+x build/Asteroids
> ./build/Asteroids
> ```

> [!WARNING]
> Do not modify the provided `debug` preset in `CMakePresets.json`,
> as it may cause CI (GitHub Actions) failure.
> Add your own preset instead if you don't want to use the provided one.

## Rules

- Your programs must compile without warnings using the provided `CMakeLists.txt`.
- **You may use any notes on the CMPUT 350 pages, as well as links to the SFML documentation and cppreference.**
- You must check the appropriate preconditions and postconditions. Your program should not crash or have undefined
  behaviour (**hint:** use assertions).
- Your programs must be well-structured and documented. Use Ctrl-X T in Emacs to pretty-print them. Marks are assigned
  for functionality, program appearance, and comments.
- If your program hangs, use Ctrl-C to terminate it.
- Remember to include the appropriate header files. To find which ones you need for functions such as `printf`, use the
  `man` command.

## Asteroids Game

You are provided with a simple Asteroids game where the player controls a spaceship that can move around and should—but
does not yet—destroy asteroids by ramming into them. Your task is to add shooting capabilities and sound effects.

The current game features:

- A spaceship that can be moved with the WASD keys
- A spaceship that rotates to face the mouse cursor
- Asteroids that move around the screen and wrap at the edges
- A game that ends rather abruptly when all asteroids are destroyed

Implement the following features by completing the `TODO` sections in `main.cpp`. Test your implementation thoroughly
to ensure smooth gameplay, and use the provided game framework.

### Shooting Mechanics

Implement the ability for the spaceship to shoot bullets.

::: info Requirements

- Fire bullets when the player presses the space bar or left mouse button. This input handling is implemented for you.
- Respect the shooting cooldown (`SHOOT_COOLDOWN = 0.1f`) to prevent bullet spam. Use the provided `mShootClock` in
  `GameState` to track the timing.
- Move each bullet a distance of `BULLET_SPEED` per frame in the spaceship's current facing direction.

:::

::: tip Direction-vector hint

There are multiple ways to calculate the bullet's delta vector each frame. Depending on how you approach the problem,
one method may be easier than another. The following trigonometric method is one option, but it may not be the easiest.

:::

#### Understanding Unit Vectors with Trigonometry

One way to compute the unit direction vector is to use trigonometry with the bullet angle:

$$
\hat{\mathbf d} = (\cos(\theta), \sin(\theta))
$$

<!--suppress HtmlUnknownTag -->
<ImageCard image="/static/img/circle.svg" title="Unit Circle" width=300 center="true"></ImageCard>

The unit circle demonstrates why trigonometric functions can be used to obtain unit vectors:

- For any angle $\theta$, a point on the unit circle has coordinates $(\cos(\theta), \sin(\theta))$.
- This gives a normalized unit vector with length 1.
- Cosine gives the horizontal ($x$) component: how much a unit vector in this direction moves right or left.
- Sine gives the vertical ($y$) component: how much a unit vector in this direction moves up or down.

::: tip Why unit vectors are relevant

Multiplying the normalized direction vector by the bullet speed gives the velocity vector that moves the bullet at the
desired speed in the correct direction. For example, if the spaceship faces $45^\circ$, then
$\cos(45^\circ) \approx 0.707$ and $\sin(45^\circ) \approx 0.707$, so the bullet travels diagonally at equal speeds in
the $x$ and $y$ directions.

:::

::: info Other requirements and tips

- Bullets should spawn at the spaceship's current position.
- Add each new bullet to the `bullets` vector.

:::

### Spaceship–Asteroid Collision

When the spaceship's hitbox—a circle—collides with an asteroid, the asteroid should be eliminated.

::: info Requirements

- Use circle-circle collision detection.
- Mark the asteroid as dead upon collision.
- Play an explosion sound upon collision, as described in [Explosion Sound Effects](#explosion-sound-effects).

:::

### Bullet Physics and Lifecycle

Implement bullet movement and lifetime management.

::: info Requirements

- Decrease each bullet's lifetime by `1.0f / 60.0f` every frame, assuming 60 FPS.
- Mark a bullet as dead when:
  - Its lifetime reaches zero or below.
  - It moves off-screen, based on its position and the window bounds.
  - It collides with an asteroid. Mark the asteroid as dead as well.

:::

### Explosion Sound Effects

Add audio feedback for destruction events.

::: info Requirements

- Play the explosion sound when:
  - A bullet hits and destroys an asteroid.
  - The spaceship rams into an asteroid.
- Play the sound immediately when the collision is detected.

:::

### Memory Management

Implement proper cleanup of game objects.

::: info Requirements

- Remove dead bullets from the `bullets` vector to prevent memory waste.
- Perform this cleanup every frame after collision detection.

:::

### Testing and Documentation

Test your program thoroughly and document your implementation.

- Test all shooting mechanics: rapid fire, cooldown, and direction accuracy.
- Test the bullet lifecycle: movement, off-screen cleanup, and lifetime expiration.
- Test bullet-asteroid and spaceship-asteroid collision detection.
- Test sound effects, including multiple explosions and their timing.
- Test edge cases, including shooting at screen boundaries and having many bullets on screen simultaneously.

*These tests are suggestions for checking that your program works.*

### Written Questions

In `lab2.txt`, answer each question in about 1–3 sentences.

::: info Questions

1. Briefly discuss how SFML's coordinate system works and how it affects angle calculations. Are there any surprising
   differences from what you would normally expect?
2. Consider the setup of the game loop. `InputSummary` summarizes the inputs (events), and then `gameState.update` looks
   only at its own state and `InputSummary`. What is the benefit of this design compared with directly modifying
   `GameState` inside `processInputs`?

:::

::: tip Additional notes

- The game uses a coordinate system where $(0, 0)$ is at the top-left.
- Which way does the $y$-axis point in SFML? If angles are still defined to rotate from the $x$-axis to the $y$-axis,
  what does this imply about angles?
- Angles may not need to be considered explicitly in your solution.

:::
