# Lab 10 Exercise Problems

Author: Daniel Zhang

> [!WARNING]
> Due: November 3rd 2026, 11:30pm

> [!IMPORTANT]
> <RepoCard repo="UofA-CMPUT350/lab-10-exercise"></RepoCard>
> Click `Use this template` button (NOT `fork`) to create your repo based on it

> [!WARNING]
> Do not modify the provided `debug` preset in `CMakePresets.json`,
> as it may cause CI (GitHub Actions) failure.
> Add your own preset instead if you don't want to use the provided one.

## Problems

*Filled Julia set*. In [lab 6](../6/exercise.md), we rendered the Mandelbrot set, one pixel at a time, on
our CPU. Chances are, even if you remembered to compile with optimizations, that this was a laggy program for you.

In this exercise, we will render a related set, the filled Julia set, on the GPU. Recall that we defined
the Mandelbrot set as the set of all points $c = a + bi \in \mathbb{C}$ such that the
sequence $z_0 := 0, z_n := z_{n-1}^2 + c$ does not
diverge in absolute value.

Given a **specific and fixed** $c \in \mathbb{C}$, we define the *filled Julia set* as the set of all
$z \in \mathbb{C}$ such that the sequence $z_0 := z, z_n := z_{n-1}^2 + c$ does not diverge in absolute value. Notice
that here, $c$ is fixed and $z_0$ varies, whereas in the Mandelbrot set, $c$
varied and $z_0$ was fixed (at 0). Notably, we can make use of an analogous fact from Lab 6:

::: important

**Fact.** A point $z$ is in the filled Julia set (for a given $c \in \mathbb{C}$) if and only if
$\lvert z_n\rvert \leq 2$ for all $n \geq 0$. In English, if you iterate through the above sequence and ever
get a complex number whose modulus is greater than 2, then $z$ is not in the filled Julia set.

:::

Since we have the same sequence (just with possibly different initial conditions), we can define the same *escape
time* as the first iteration $i \geq 1$ at which $\lvert z_{i - 1} \rvert > \texttt{ESCAPE\_RADIUS}$. For the purpose
of this exercise, we'll assume we want smoothed escape times directly. Use an escape radius of 4 (recall from Lab
6 that all escape radii $\geq 2$ are “correct”), and use the smoothing formula for the escape time:

$$
n + 1 - \frac{\ln\ln\lvert z_n \rvert}{\ln 2}
$$

where $n \geq 1$ is the regular discrete escape time. Note that GLSL provides `log(x)` as the natural
log, and also provides `length(x)` to get the norm of a vector. We have provided in `main.frag` a free
definition of `LOG_2`.

The Mandelbrot set is thus a snapshot of all the filled Julia sets — specifically, it is the picture
formed if you take the colour of each filled Julia set (parameterized by $c$) sampled at their
origin and plotted them along 2 axes for the real and imaginary parts of $c$. You can imagine
a 4D volume which has 2 axes corresponding to $c$ and 2 axes corresponding to $z$,
and the Mandelbrot set is the image taken by the level set corresponding to $z = 0 + 0i$, and each
filled Julia set is the image taken by the orthogonal level set corresponding to a given $c \in \mathbb{C}$.

In `main.frag`, we have the following uniforms, all of which must be set by the host (CPU):

   ```glsl
   uniform vec2 c;
   uniform int MAX_ITERS;
   uniform vec2 windowSizePixels;
   uniform vec2 camCenterWorld;
   uniform float camWorldUnitsPerPixel;
   ```

Since the filled Julia set is parameterized by a fixed $c$, it will be a uniform constant
across all of our threads. Similarly, the number of iterations to calculate the sequence, as well as the
camera settings are also shared among all threads.

1. Implement in the same fragment shader

   ```glsl
   EscapeTime escapeTimeSmooth(vec2 z)
   ```

   which returns the smoothed escape time for a given $z_0 = z \in \mathbb{C}$ and for the fixed uniform
   $c \in \mathbb{C}$. Notably, our implementation here differs in that we return an `EscapeTime` `struct`:

   ```glsl
   struct EscapeTime {
       float iters;
       bool isInf;
   };
   ```

   which just sets a flag if infinity, else sets the `iters` `float`. It is possible to get an IEEE 754
   infinity float as before, but it's a bit more involved to do (without invoking UB), so we'll do this
   for simplicity. Note that in GLSL, you can “construct” a `struct` like so:

   ```glsl
   MyType ret = MyType(firstFieldVal, secondFieldVal, ..., lastFieldVal);
   ```

2. Implement

   ```glsl
   vec2 windowToWorld(vec2 windowCoords)
   ```

   which uses the camera uniforms above to convert a window-space (pixels) point to a world-coordinates point.

   Then, in `main()`, implement a shader which plots the filled Julia set for a given $c$.
   The $x$ axis in world coordinates correspond to all possible values of the real part of
   $z$, and the $y$ axis in world coordinates correspond to the values of the
   imaginary part of $z$. Use the provided `vec4 colorTime(float t)` for coloring a given (non-infinite) escape
   time.

   In `main.cpp`, we have already provided input-handling logic for you. In particular, scrolling will
   zoom in/out relative to the **center** of the camera view, using WASD will translate $c$,
   and using the arrow keys will translate the camera position. We have also implemented exponentially
   increasing `maxIters` if the camera has not moved for the frame, like in Lab 6. Finally, we have
   provided default values for `c`, `worldUnitsPerPixel`, and `camCenterWorld`. In the main loop, set the
   shader uniforms and write the drawing logic.

   If the provided `TRUE_MAX_ITERS` is too much for your machine, you may reduce it to 8192, 4096, etc. (any further
   is very unlikely).

   By the completion of this problem, you should have a functional filled Julia set viewer, where
   adjusting $c$ with WASD will change the specific Julia set you're viewing, and using arrow
   keys with scrolling can navigate the world.

3. *Supersampling anti-aliasing*. Implement supersampling anti-aliasing on the GPU. We have provided in
   `main.frag` a defined `AA`, which corresponds to the number of subsamples along each dimension. If
   `AA` was 3, then you would take 9 samples total within each pixel. You can imagine dividing up the
   pixel square into 3 even lengths along each side, producing 9 sub-squares, which you need to sample
   the centers of, finally averaging the sampled colours as the pixel's true result.

   Your code should be *correct* for any `AA` $\geq 1$, but it is normal for performance to degrade as it increases.

   A solution at this point might look something like:

   <ImageCard
     image="/static/img/lab10_ex.png"
     width="1280px"
     :center="true"
   />

   Visualized escape times for the filled Julia set for $c = -0.039 + 0.68i$

4. *Reprojection and temporal anti-aliasing*. In Lab 6, you might have noticed that it was a pain to move
   around once you were zoomed into an area with high escape-times, because you'd have to wait for the
   exponentially-increasing iteration count to make its way back up even if you just moved a little bit.
   In this problem, we implement a semi-solution to make use of old frame data, which we outline at a
   high level.
    - In your main fragment shader, add uniforms which store the state of the camera (scale, position)
      **from the previous frame**. You will need to modify `main.cpp` to store and set these uniforms.
      Additionally, add a `sampler2D` uniform to a texture which will store the rendered result from the
      last frame. You will need to figure out a way to implement this — one way is to set up a dual-buffer (two
      `sf::RenderTexture`s which alternate roles as “front” and “back”), and then write a fragment
      shader to clone a given texture (as a uniform) into the `sf::RenderWindow`. You should call
      `.setSmooth(true)` on these textures to enable linear interpolation, otherwise the TAA will have artifacts.

    - In your main fragment shader, for each sub-pixel sampled, compute the world coordinate corresponding
      to that sub-pixel location and then compute the OLD (last frame) window coordinates of those world
      coordinates. If it's out of the (previous) camera location, just calculate the escape time color the
      normal way according to the given `MAX_ITERS`. If it's within the previous frame's camera rectangle,
      do an exponentially moving average with the old buffer value and the normal calculation.

      Once you have that, find a way to dynamically adjust the $\alpha$ used in the EMA based on
      the iteration count of the sample. An iteration count close to 0 should have $\alpha$ close
      to 0 (preferring the old accumulated frame value), and an iteration count close to $\texttt{TRUE\_MAX\_ITERS}$
      (which is hardcoded as 16384) should have $\alpha$ close to 1 (preferring the new calculated
      value). If $c$ changed, then there's little useful information from the last frame and
      $\alpha$ should be 1.
