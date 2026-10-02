# Lab 6 Exercise Problems

Authors: Daniel Cui, Daniel Zhang

> [!WARNING]
> Due: October 9th 2026, 11:30pm

> [!IMPORTANT]
> <RepoCard repo="UofA-CMPUT350/lab-6-exercise"></RepoCard>
> Click `Use this template` button (NOT `fork`) to create your repo based on it

> [!WARNING]
> Do not modify the provided `debug` preset in `CMakePresets.json`,
> as it may cause CI (GitHub Actions) failure.
> Add your own preset instead if you don't want to use the provided one.

## Introduction

In this exercise you will complete the implementation of an interactive Mandelbrot set viewer. In particular, you will
plot the *escape times* of points *not* in the Mandelbrot set as coloured, and points *in* the set as black.

<ImageCard
  id="fig-default"
  image="/static/img/lab6_full.png"
  title="A wide view of the Mandelbrot set. Black points are in the set, coloured points are not."
  :center="true"
/>

<ImageCard
  id="fig-zoomed"
  image="/static/img/lab6_zoomed.png"
  title="A zoomed in view of the Mandelbrot set."
  :center="true"
/>

Typically, in graphics, we represent functions on 2D spaces with the use of sampled textures. This means taking some
continuous function defined over a surface (e.g., the albedo or bump map on, say, a tree's bark), and *sampling* it so
that we get a finite, discrete approximation (a 2D array of colours at some resolution). This leads to issues such as
aliasing (e.g., jaggies), when you sample at a low frequency but the signal contains high-frequency components. These
approximations are also expensive to store — each pixel is typically 4 bytes (a byte per channel, and higher, if you are
doing rendering work in HDR), and once you zoom in you lose detail.

In this lab, we consider instead a function on the 2D plane that can be represented algorithmically, with few lines of
code, but with arbitrarily high precision (up to the precision you have in your floating point representation). The cost
we pay to render such an image representation is now no longer storage, but instead, computation.

## A primer on complex numbers

Complex numbers are expressions of the form $a + bi$, where $a \in \mathbb{R}$ and $b \in \mathbb{R}$ are real numbers.
By definition, $i$ is the imaginary unit satisfying $i^2 = -1$. It will become clear that as a vector space, the set of
all complex numbers $\mathbb{C}$ is isomorphic to $\mathbb{R}^2$.

We call $a$ the “real part” of the complex number: $\mathrm{Re} (a + bi) := a$.\
We call $b$ the “imaginary part” of the complex number: $\mathrm{Im} (a + bi) := b$.

Common operations:

- **Addition**: $(a + bi) + (c + di) = (a + c) + (b + d)i$
- **Subtraction**: $(a + bi) - (c + di) = (a - c) + (b - d)i$
- **Multiplication**:

  $$
  \begin{align*} (a + bi) \times (c + di) &= ac + adi + bci + bd (i)^2 \\
  &= ac + (ad + bc)i - bd \\
  &= (ac - bd) + (ad + bc)i
  \end{align*}
  $$

- **Division**: Not relevant for this lab. But you just multiply numerator and denominator by the complex conjugate of
  the denominator and then simplify. The *complex conjugate* of $c + di$ is denoted $\overline{c + di} := c - di$.
- **Squaring**: Using the above multiplication derivation, $(a + bi)^2 = (a^2 - b^2) + 2abi$
- **Modulus (norm)**: The modulus of a complex number $a + bi$ is denoted $\lvert a + bi \rvert := \sqrt{a^2 + b^2}$.
  Note that this is exactly the Euclidean norm applied to the corresponding vector $(a, b) \in \mathbb{R}^2$

We associate the complex number $(x + yi)$ to the point $(x, y)$ in the plane.

## The Mandelbrot set

The Mandelbrot set is a 2D set. It is defined as all complex numbers $c$ for which the complex
sequence $(z_n)_{n \geq 1}$ given by

$$
z_n := f_c (z_{n-1}) = z_{n-1}^2 + c
$$

does not diverge in absolute value when iterated with an initial value of $z_0 := 0 + 0i$.

::: info Mandelbrot membership

A point $c$ is in the Mandelbrot set if and only if $\lvert z_n \rvert \leq 2$ for all $n \geq 0$. In English, if you
iterate through the above sequence and ever get a complex number whose modulus is greater than 2, then $c$ is not in the
Mandelbrot set.

:::

The Mandelbrot set is of interest because even though it has a simple definition, it displays complex but self-similar,
fractal behaviour as you zoom in on its boundary. For example in the [zoomed view](#fig-zoomed), you can observe
self-similar repetitions of the large black circle on the right on its boundaries. Furthermore, when you visualize the
*escape times* of points **not** in the Mandelbrot set (these are visualized as non-black in the above images), you get
very aesthetically pleasing patterns.

### Examples

#### A trivial point not in the Mandelbrot set

Consider $c = 3 + 0i$ (corresponding to $(3, 0)$ on the plane). By our above fact, $\lvert 3 \rvert = 3 > 2$, so we
already know it's not in the set. But just to make sure,

$$
\begin{align*}
z_1 &:= f_3 (z_0) = f_3 (0) = 0^2 + 3 = 3\\
z_2 &:= f_3 (z_1) = f_3 (3) = 3^2 + 3 = 12 \\
z_3 &:= f_3 (z_2) = f_3 (12) = 12^2 + 3 = 147 \\
z_4 &:= f_3 (z_3) = f_3 (147) = 147^2 + 3 = 21612
\end{align*}
$$

It should be clear that the norm of this sequence grows without bound, hence $3$ is not in the Mandelbrot set.

#### A slightly less trivial point not in the Mandelbrot set

Consider the point $c = \sqrt{2} + i\sqrt{2}$. This corresponds to the 2D point $(\sqrt{2}, \sqrt{2})$. We start
with $z_0 := 0$. Then:

$$
\begin{align*}
z_1 &:= f_c (0 + 0i) = (0 + 0i)^2 + (\sqrt{2} + \sqrt{2}i) \\
&= (\sqrt{2} + \sqrt{2}i)
\end{align*}
$$

Whose norm $\lvert z_1 \rvert = \sqrt{2 + 2} = 2 \leq 2$, so we can't immediately exclude it based on our above fact. We
continue to iterate:

$$
\begin{align*}
z_2 &:= f_c (z_1) = (\sqrt{2} + \sqrt{2}i)^2 + (\sqrt{2} + \sqrt{2}i) \\
&= (2 + 2i + 2i + 2 (i)^2) + (\sqrt{2} + \sqrt{2}i) \\
&= (2 + 4i - 2) + (\sqrt{2} + \sqrt{2}i) \\
&= \sqrt{2} + (4 + \sqrt{2})i
\end{align*}
$$

Now
check $\lvert z_2 \rvert = \sqrt{\sqrt{2}^2 + (4 + \sqrt{2})^2} = \sqrt{2 + 16 + 8\sqrt{2} + 2} = \sqrt{20 + 8\sqrt{2}} > \sqrt{20 + 8}$,
where the last inequality is because $\sqrt{2} > 1$. Then this is $= \sqrt{28} > \sqrt{25} = 5 > 2$,
hence $c = \sqrt{2} + i\sqrt{2}$ is not in the Mandelbrot set.

### What about points in the Mandelbrot set?

For a trivial example, it should be clear that starting with $c = 0$ will give $0 = z_1 = z_2 = z_3 = ...$ forever.
Furthermore, by our above fact, all points in the Mandelbrot set *must* belong within the circle at the origin of 
radius 2. However, in general it is unknown whether the Mandelbrot set is computable. Practically speaking, we will only 
cull potential candidates as opposed to prove points are definitely in the set.

If you want some visual intuition, look at the [wide view](#fig-default) and [zoomed view](#fig-zoomed). The pixels
colored black are the points we have not culled from the Mandelbrot set at the iteration limit we ran to.

## Algorithmically checking set membership

Suppose I give you a point $(x, y)$ on the plane (again, corresponding to $x + yi = c$).

Then you can check whether the point is in the Mandelbrot set by the following iterative process. Begin with `zX = 0`
and `zY = 0`, representing $z = (z_x, z_y) = (0, 0)$. Each iteration, compute `zPrimeX` and `zPrimeY` with the
formula $z^2 + c$ (remember that squaring a complex number gives you a complex number). Check if the modulus of this
resulting $z'$ (`zPrimeX`, `zPrimeY`) exceeds 2 [+note1]. If at any iteration the norm exceeds 2, you know for sure $c$
is not in the set.

[+note1]: There is an optimization you can do here to avoid an expensive `std::sqrt`.

Otherwise, if the norm remains at most $2$, reassign `zX`, `zY` to the corresponding prime'd components and repeat the
same steps on the next iteration.

Because you have finite computation time, you will need a maximum number of iterations. For instance, suppose
`int maxIters = 100`. If the modulus $\lvert z_n \rvert$ never **strictly** exceeds 2 in the first `maxIters`
iterations, you *might* be in the set, as so far it hasn't been proved that you're not. For the purposes of our
algorithm, we treat $c$ as a possible member of the set and return an infinite escape time.

Thus, given a finite computational budget (number of iterations), you can come up with a shortlist of candidates which
are in the Mandelbrot set. The more iterations you run, the fewer candidates remain (converging to the true Mandelbrot
set).

## Escape time

But wait! Just checking set membership gives you a binary function (e.g., black for in the set, white for not). I want
colourful pictures — how do I do that?

**Answer**: We create a spectrum of values instead of a binary value by returning the *escape time* of a point, instead
of just its set membership. If the norm $\lvert z_n \rvert$ is greater than $2$ at an iteration $n$ **for the first
time**, we say it has escape time $n \geq 1$, which we then return from our function as a `double`. Otherwise, if it
does not escape within `maxIters` iterations (i.e., is possibly in the Mandelbrot set), we return
`std::numeric_limits<double>::infinity()` (from the `<limits>` library).

Note that if a point is actually in the set, it will never escape, hence why we choose $\infty$ for the escape time of
possible contained points.

::: important Problem 1

Implement

```cpp
double mandelbrot(double cX, double cY, int maxIters)
```

which returns the escape time of a point in the plane $c = (c_x, c_y)$ (corresponding to $c_x + ic_y$) according to the
algorithm described in sections [Algorithmically checking set membership](#algorithmically-checking-set-membership)
and [Escape time](#escape-time).

:::

## Colouring

*Note: background only. This is mostly implemented for you.*

We need a way to visualize this now continuous spectrum of values ranging from $[1, \infty)$. There are multiple ways of
doing this. By convention, points in the set are coloured black. But for points not in the set, you could for example
divide the escape time by `maxIters`, which yields a grayscale value between $[0, 1)$ that you can then rescale on
the $[0, 256)$ range for each of the RGB channels. The problem is that the shading is dependent on the `maxIters`
hyperparameter.

An alternative approach is to define a cyclic gradient on some range of values. In our case we use the range $[0, 40)$.
Then, we can take any scalar real number $t \in \mathbb{R}$ modulo $40$ to get it within the range. Finally, we find the
two surrounding “keyframes” in the gradient and linearly interpolate between them to get the colour for $t$.

The definition of a `CyclicGradient` is given to you for free in `CyclicGradient::DEFAULT_GRADIENT`. It has a call
operator `sf::Color CyclicGradient::operator()(double val)` such that you can call `CyclicGradient::DEFAULT_GRADIENT(n)`
where `n` is a `double`, and get a colour corresponding to iteration $n$.

When you're done, if you have extra time, feel free to play around with the gradient so long as it remains aesthetically
pleasing.

## The camera

We've now defined a world space on the 2D plane $\mathbb{R}^2$ — the colour at world point $(x, y)$ is the colour
received by passing the iteration $n$ at which $\lvert z_n \rvert = \lvert f_c (z_{n-1}) \rvert$ is greater than the
escape radius (for now, $2$) to `CyclicGradient::DEFAULT_GRADIENT`. If the point does not escape within `maxIters`
iterations, instead we colour the point black.

We now need a camera which can zoom and pan within this world space. Similarly to an `sf::View`, our app has fields for
the world-space subrectangle that is being rendered to the window (the view of the world). These are the
`mMinPointWorld` and `mMaxPointWorld` fields in `MandelbrotViewer`:

- `mMinPointWorld` stores the minimum $x$ and $y$ world-space coords being rendered (corresponding to the bottom-left of
  the world).
- `mMaxPointWorld` stores the maximum $x$ and $y$ world-space coords being rendered (corresponding to the top-right of
  the world).

In our case, this world rectangle is always rendered to fill the entire window. We have two buffers which act as the
“film” of the camera.

- `mViewBuffer` is an `sf::Image` ([Documentation](https://www.sfml-dev.org/documentation/3.0.2/classsf_1_1Image.html))
  which is our CPU-side in-memory buffer that we will render into, pixel-by-pixel.
- `mViewBufferGPU` is a `sf::Texture`, i.e., a GPU-side VRAM buffer, which we will copy into from `mViewBuffer`.

The latter also allows us to create a `sf::Sprite`.

Note that the window coordinates have their origin at the top-left of the window, with y pointing down and x to the
right, and with $(\text{window width}, \text{window height})$ as the coordinate of the bottom-right of its
bottom-right-most pixel. However, the world coordinates have y pointing up, and in general will have different scale
than the window coordinates.

::: important (Trivial) Problem 2

Implement

```cpp
void MandelbrotViewer::copyViewBufferToGPU()
```

which just loads `mViewBuffer` into `mViewBufferGPU` as a one-liner. You may wish to reference
the [documentation](https://www.sfml-dev.org/documentation/3.0.2/classsf_1_1Texture.html).

:::

::: important Problem 3

Implement

```cpp
sf::Vector2<double> MandelbrotViewer::windowPosToWorld(const sf::Vector2<double>& pWindow)
```

which takes a point in window coordinates, and makes use of the world-space view bounds and the `mWindowSize` field to
compute the corresponding world-space coordinate that is shown at that window pixel.

:::

## Zooming and resizing

Panning is implemented for you.

We compute zooms by taking the total “distance” scrolled $d$ (as reported by SFML), and then scaling the size of the
world-space view by $b^d$, where $b$ is given by `ZOOM_EXPONENT_BASE = 1.01`. Exponentiating like this means that there
is a constant “factor” of scaling per distance scrolled on the scrollwheel (analogous: compounding interest).

We handle resizing by updating the world-space view bounds such that their rectangle's aspect ratio matches the new
window size. Furthermore, the center of the new world-space rectangle matches the old center before the resize. The
world-space rectangle's size in each dimension is multiplied by **the same factor as by which the window was resized in
the respective dimension**. This has the effect of **not shrinking, nor zooming the image itself**, only cropping or
extending the seen pixels.

Resizing the window also means having to resize the view buffers, such that they always have exactly the same dimensions
in pixels as the window. This is mostly done for you.

Complete the TODOs in the following:

::: important Problem 4 (Zoom)

Implement

```cpp
void MandelbrotViewer::handleZoom(double scrollDistance, sf::Vector2i mousePosition)
```

according to the logic described above. After the zoom, the new world-coordinate bounds will have size
`(worldViewFactor * (orig world width), worldViewFactor * (orig world height))`, and the user's cursor should point at
exactly the same thing they pointed at before the zoom.

:::

::: important Problem 5 (Resize)

Implement the TODOs in

```cpp
void MandelbrotViewer::handleWindowResize(sf::Vector2u newSize)
```

according to the logic described above. Update `mMinPointWorld` and `mMaxPointWorld` such that the world view is the
same aspect ratio as the new window size (such that the view is not distorted). The new world view should have the same
world center as the old one, and the resize should only give the effect of cropping or extending new pixels, not zooming
in or out.

You will additionally need to resize the gpu-side copy of the view buffer, to match the new window size.

:::

## Drawing

We can draw into our `mViewBuffer` using `sf::Image`'s `setPixel` method, which has signature
`void sf::Image::setPixel(sf::Vector2u coords, sf::Color color)`. Drawing is done by using our `windowPosToWorld`
implementation from Problem 3 to convert the window-coordinates of the **center** of each pixel to a world-coordinates
point. You will then need your `mandelbrot` implementation to determine the escape time at this point, which you can
then use to color the pixel.

::: important Problem 6

Implement

```cpp
void MandelbrotViewer::drawIntoViewBuffer(int maxIters)
```

which renders all of `mViewBuffer` according to the description above and in the comments. In particular, calls to
`mandelbrot` should use the given `maxIters`.

:::

Upon completion of all the problems up to now, you should get something like

<ImageCard
  id="fig-rough"
  image="/static/img/lab6_rough.png"
  title="A rendering of Mandelbrot set escape times without smoothing."
  :center="true"
/>

Note that the coordinates at the top-left track your cursor using your implementation of `windowPosToWorld`.

## Smoothing

To achieve a smooth image, we want a way of calculating *partial iterations*. Take it as given (you may look up details
after the lab) that the formula for calculating a *fractional iteration count* is

$$
n + 1 - \frac{\ln{\ln{\vert z_n\vert}}}{\ln{2}}
$$

where $n$ is the discrete iteration at which you first exceed the escape radius in the complex plane (i.e., the modulus
exceeds, say, 2), and $z_n$ is the corresponding newest $z$ value that first has a modulus which is greater than the
escape radius.

::: important Problem 7

Copy and paste your implementation of `mandelbrot` into `mandelbrotSmooth` and return the above fractional iteration
count instead of the discrete iteration count $n$ upon determining that $c$ is not in the Mandelbrot set.

You will need to increase the escape radius (originally 2) to avoid artifacts. Note that the more you increase it, the
more computationally expensive the procedure becomes. However, it is always *correct* in the sense that, if the sequence
were to diverge beyond 2, it will eventually diverge beyond any positive number. We recommend an escape radius of 4.

**Hint**: `<cmath>` has `std::log` and `std::sqrt`, and `LOG_2` (i.e., $\ln (2)$) is provided to you as a constant in
`mandelbrot.h`.

:::

Upon completion of Problem 7, you should now get images as shown in the Introduction. Note that we have implemented
logic for you that exponentially increases the iteration count from 50 to 3200 (doubling at each step) as long as you
don't move or resize the window during a frame. Once you move, the rendering restarts at 50 iterations.

## Written problems

In `lab4.txt`, answer the following in 1-2 sentences each:

1. In our doubling-iteration scheme, why do we start from a low number? Consider effects on rendering
   time/responsiveness and that we must finish a call to `mandelbrotSmooth` for each pixel before going on to the next
   frame.
2. Propose a way to increase efficiency of rendering for high iteration counts, exploiting that the rendering of each
   pixel is independent of the other pixels, and assuming you can use multiple computers/cores/threads at the same time
   (whatever level of abstraction you're comfortable with). In particular, suppose you can coordinate these computers by
   having one of them delegate tasks to others and wait for their results.
3. At “farther away” zooms with 1 centered sample per pixel, some regions of the set will look like speckled noise (try
   zooming into the [zoomed view](#fig-zoomed)!), with jaggies at the boundary of the set. Consider and discuss what
   would happen if we sampled at the center of 4 *subpixels* per pixel and averaged the colors instead, from both a
   visual perspective and a performance perspective.
