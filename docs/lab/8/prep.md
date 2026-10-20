# Lab 8 Prep Problems

Author: Daniel Zhang

> [!WARNING]
> Due: October 20th 2026, 2:00pm

> [!IMPORTANT]
> <RepoCard repo="UofA-CMPUT350/lab-8-prep"></RepoCard>
> Click `Use this template` button (NOT `fork`) to create your repo based on it

> [!WARNING]
> Do not modify the provided `debug` preset in `CMakePresets.json`,
> as it may cause CI (GitHub Actions) failure.
> Add your own preset instead if you don't want to use the provided one.

## Sprites

### History (Optional)

Historically, video game systems faced multiple constraints which necessitated special hardware for handling
rendering 2D bitmap images (sprites) to the screen. Specialized hardware support for sprite rendering is
commonly known as *hardware sprites*. This section covers historical costs and limitations surrounding
hardware sprites.

#### (Monetary) cost of memory

Consider that the Atari 2600 had a pixel display with a resolution of $160 \times 192$. Supposing we wanted to
support 128 colours per pixel ($\log_2 (128) = 7$ bits), we would need $(160 \times 192) \times 7 = 215,040$ bits,
or $26,880$ bytes. In 1977, 16KB of RAM could cost $\$575$ USD [+note3], which makes the cost of the memory
for the screen *alone* $\approx 1.68 \times \$575 = \$966$ USD.

Adjusted for inflation, this is approximately \$5,300 USD (\$7,200 CAD) in 2025.
Clearly, it was infeasible to sell such a system as a household game console. Hence, it was either infeasible
or costly to store entire framebuffers (a buffer of the entire screen's pixels) in memory. Instead, many early
game systems only had enough memory to render on a scanline basis (one row of pixels at a time).

By using this optimization (along with others), the Atari 2600 shipped with only 128 bytes of RAM.

#### (Time) cost of computation

Even supposing we could store an entire framebuffer at a time, a purely software + framebuffer approach to
sprites would mean having to erase each sprite from the last frame, and redrawing them in their new position
on the current frame, before sending the framebuffer to the screen. Having the CPU handle this would mean
eating up cycles not spent on actually running the game logic. Note that up until 2001 (with the IBM POWER4),
computer processors were single-core (!)

With hardware sprites, classic gaming systems had dedicated hardware *separate from the CPU* which
automatically composited (overlayed) sprites with CPU-configurable images and positions (and sometimes other
transformations) onto a background. As the video chip processed a scanline, it would check which configured
sprites intersected it and lookup the sprite pixel data accordingly, before sending the scanline to the
screen. This frees up the CPU to focus on executing game logic, simulation, collision checking, etc..

#### Limitations of hardware sprite support

However, building dedicated hardware support means making tradeoffs between other limitations. Hardware
sprites only supported limited number of sprites on the screen, and beyond that, limited (often strictly
fewer) sprites *per scanline*. For example, the Atari 2600 only supported 5 sprites at a time, the NES
supported 64 on a screen with only 8 per scanline, and even the 2004 Nintendo DS supported only 128 sprites at
a time.

Supporting more sprites per scanline means increasing the time of checking the intersecting sprites per
scanline, which at some point means not achieving the desired FPS. This is why sprites “flicker” [+note4]
on systems like the NES when 9 or more sprites show up on a line — programmers would implement *sprite
cycling* to randomize which 8 sprites showed up on a given frame, so that the player could still see all 9 (but with
flickering).

Other limitations included limited colours [+note5], maximum texture sizes as well as limitations on the
types of transformations supported on the sprites. The NES and Sega Genesis both did not support zoom/scaling,
and while all of the Atari 2600, NES, and Genesis supported various texturing mirroring, none of them
supported arbitrary 2D rotations. The 1990 SNES supported arbitrary affine transforms *only on the
background*. It wasn't until 3D support became commonplace in the 32-bit era that arbitrary affine transforms
became widely supported on sprites.

Nowadays, ~~memory is cheap (in 2025, a 64 GB DDR4 kit can be obtained for under \$200 CAD), and~~ we
have powerful dedicated GPUs for parallel 3D processing and rendering. For this reason, we no longer need
hardware sprites. We can easily store full-screen framebuffers in memory (A 1080p RGBA buffer with a byte per
channel is only 8.3 MB), and we can effectively treat sprites as simple 3D geometry to send to our 3D hardware
accelerators (GPU rasterizers and raytracers). In this lab, we will work towards building sprites in this
modern paradigm — namely, 2D rendering is just treated as a special case of 3D rendering. Indeed, SFML is
implemented on top of OpenGL, which just calls the 3D rasterizer on the GPU.

### Sprites (TL;DR)

A sprite is a flat quad (represented as a coplanar set of 4 points in counterclockwise order), together with a
texture. Because GPUs work fundamentally with triangles, each quad is cut diagonally and represented
geometrically as two triangles. We can assign a point in a texture to any point in the quad by assigning “UV
coordinates” (2D coordinates in texture space) to each of the 4 corner points, and interpolating in the
texture space between the corners depending on the point in the quad.

To draw a sprite you send to the GPU vertex attribute data for each triangle (position, UV-coordinates), bind
the appropriate texture, and issue a draw call.

In the following two sections we cover both the geometry and the texturing side in detail.

### Geometry

A modern representation of sprites (indeed, almost any renderable object) has two main components:

1. its geometry (and any transformations thereof), and
2. its material (texture, colour, blending mode).

Here's a brief geometry primer.

#### Coordinate systems

In 2D, should the y-axis point up or down? Up is more geometrically intuitive with respect to the standard
basis, and down makes sense if you think about how an image bitmap is laid out in memory (since row 0 is the
top). In OpenGL, the viewport origin is at the bottom-left. In SFML, it is at the top-left. Similarly, for
texture UV-coordinates (discussed in section [Textures](#textures)), SFML defines the origin $(0, 0)$
to be the top-left, but OpenGL uses the bottom-left.

Finally, there is a matter of scale — SFML is designed such that the opposite screen corner to the origin is
at point $(\text{screen width}, \text{screen height})$ (and similarly for textures, texture width/height, though this
can be configured to
be in $[0, 1]^2$ using `sf::CoordinateType::Normalized`). If you were to touch OpenGL, in fact you would
think of the screen in the range $[-1, 1]^2$.

To keep things simple we will adopt SFML's convention, but always be aware of the coordinate system you are
working in!

#### Primitives

We assume a Euclidean setting. Informal definitions:

- Points: a *point* is a location in an underlying space. In $d$-dimensional Euclidean space, it
  is often represented as a $d$-tuple $\mathbf{p} = (p_1, \dots, p_d)$. In 2-dimensional Euclidean space, we can
  write $\mathbf{p} = (p_x, p_y)$.
- Vectors: a *vector* is a difference/displacement between two points. It can similarly be represented as a
  $d$-tuple in $d$-dimensional space $\mathbf{v} = (v_1, \dots, v_d)$. In 2D we may write
  $\mathbf{v} = (v_x, v_y)$.

If both points and vectors are represented in memory as $d$-tuples, what's the difference?
Semantically, one can subtract points to obtain a vector, and add a vector to a point to get a new point. But
beyond that (and perhaps more tangibly), there are differences in how one applies *transformations* to them.

#### Transforms

You may recall from linear algebra that in the Euclidean setting, all linear transforms $f$ on
vectors have a corresponding matrix $A$ such that $f (\mathbf{v}) = A\mathbf{v}$. Recall furthermore that a
transform $f$ is linear iff $f (\alpha \mathbf{v} + \mathbf{u}) = \alpha f (\mathbf{v}) + f (\mathbf{u})$ for
all $\alpha \in \mathbb{R}$ and for all $\mathbf{u}, \mathbf{v} \in \mathbb{R}^n$.

It would be convenient if we could extend our linear algebra tools to include one of the most common
transforms in video games — translations, so that we can make use of tools like matrix inverses and
composition. Clearly, translation is not linear because, for example, $(x + y) + 5 \not = (x+5) + (y+5)$. 
Thankfully, we have a useful fact — all *affine transforms* (composition of a linear transform and a translation) in
$d$-dimensional space can be represented as a linear transform on $(d+1)$-dimensional
space, using *homogeneous coordinates*.

##### Homogeneous coordinates

If you just care about doing the problems, the TL;DR of this section is — points and vectors are different
things. In particular, points are affected by translation transformations, and vectors are not, because
vectors are “points at infinity”. For example, suppose I had a struct like

```cpp
struct Ray {
    Point2D position;
    Vector2D direction;
};
```

(which is just a directed line starting from some origin point). If I wanted to translate this ray, the
translation should apply to the origin position, but not the direction (or else your ray would point in a
different direction).

###### Points

The (canonical) *homogeneous coordinates* of a point $\mathbf{p} = (p_1, \dots, p_d)$ in $\mathbb{R}^d$ is the
$(d+1)$-tuple $(p_1, \dots, p_d, 1)$ (e.g., in 2D, $(p_1, p_2, 1)$). Furthermore, for any $\lambda \not = 0$, we
define the equivalence $(p_1, p_2, p_w) \sim (\lambda p_1, \lambda p_2, \lambda p_w)$ — that is, any two homogeneous
coordinates which are just scalar
multiples of each other represent the same underlying point. By convention, we normalize so that
$p_w = 1$, i.e., $(p_1, p_2, p_w) \sim \left (\frac{p_1}{p_w}, \frac{p_2}{p_w}, 1\right)$. Without loss of generality,
from now on we assume $p_w = 1$ for
all points.

###### Vectors

The *homogeneous coordinates* of a vector in $\mathbb{R}^d$ is the $(d+1)$-tuple $(v_1, \dots, v_d, 0)$.
Note that by (informally) viewing this
as $\lim_{v_w \to 0^+} (v_1, \dots, v_d, v_w) \sim \lim_{v_w \to 0^+} \left (\frac{v_1}{v_w}, \dots, \frac{v_d}{v_w}, 1\right)$,
a vector is a “point at infinity” (thus truly just
representing a direction, and not a point). Also, note that under this convention, adding a vector to a point
yields a point, and subtracting two points yields a vector.

With our conventions on homogeneous coordinates for both points and vectors, we can always just store a
point/vector in $\mathbb{R}^d$ with $d$ floats (as opposed to $d+1$), since the last
coordinate is always known.

##### Transformation matrices

*For your own benefit only — not strictly needed for the problems*.

###### Translation

The *translation matrix* which translates a point by the vector $\mathbf{t} = (t_x, t_y, 0)$ in 2D is given by

$$
T = \begin{bmatrix}
1 & 0 & t_x \\
0 & 1 & t_y \\
0 & 0 & 1
\end{bmatrix}
$$

Which we can verify:

$$
\begin{align*}
T \mathbf{p} &= \begin{bmatrix}
1 & 0 & t_x \\
0 & 1 & t_y \\
0 & 0 & 1
\end{bmatrix} \begin{bmatrix}
p_x \\ p_y \\ 1
\end{bmatrix} = \begin{bmatrix}
p_x \cdot 1 + p_y \cdot 0 + 1 \cdot t_x \\
p_x \cdot 0 + p_y \cdot 1 + 1 \cdot t_y \\
p_x \cdot 0 + p_y \cdot 0 + 1 \cdot 1
\end{bmatrix} = \begin{bmatrix}
p_x + t_x \\
p_y + t_y \\
1
\end{bmatrix} = \mathbf{p} + \mathbf{t}
\end{align*}
$$

###### Scale

Furthermore, the *scale matrix*, which scales $p_x$ by $s_x$ and $p_y$ by
$s_y$ (i.e., the Hadamard/element-wise product $\mathbf{p} \odot \mathbf{s}$) is given by:

$$
S = \begin{bmatrix}
s_x & 0 & 0 \\ 0 & s_y & 0 \\ 0 & 0 & 1
\end{bmatrix}
$$

which is again easily verified:

$$
\begin{align*}
S \mathbf{p} &= \begin{bmatrix}
s_x & 0 & 0 \\
0 & s_y & 0 \\
0 & 0 & 1
\end{bmatrix} \begin{bmatrix}
p_x \\ p_y \\ 1
\end{bmatrix} = \begin{bmatrix}
s_x \cdot p_x + 0 + 0 \\
0 + s_y \cdot p_y + 0 \\
0 + 0 + 1
\end{bmatrix} = \begin{bmatrix}
p_x \cdot  s_x \\
p_y \cdot s_y \\
1
\end{bmatrix} = \mathbf{p} \odot \mathbf{s}
\end{align*}
$$

###### Rotation

Finally, the *rotation matrix* $R_\theta$, which rotates points and vectors an angle of $\theta$
counterclockwise around the origin, is given by remapping the $x$-basis vector to $(\cos (\theta), \sin (\theta))$
and the $y$-basis vector to $(-\sin (\theta), \cos (\theta))$ (verify for yourself that this is the case). Recall
that the linear transform which remaps basis vectors just stacks the new basis vectors as column vectors
side-by-side (you can easily verify this by multiplying with the standard basis vectors) — in this case,
extending to homogeneous coordinates we get:

$$
R_\theta = \begin{bmatrix}
\cos (\theta) & -\sin (\theta) & 0 \\
\sin (\theta) & \cos (\theta) & 0 \\
0 & 0 & 1
\end{bmatrix}
$$

By composing these matrices, you obtain a transformation matrix for the composed transforms, and inverting the
final matrix yields the composition of applying the inverse transforms in reverse order.

*For your own understanding:* By convention, a general affine transform object applies scale first, then
rotation, then translation. What happens if we change the order of any of these? Why might the result be
undesirable from a user perspective?

Another thing to consider is that the above verifications used points. Try for yourself what happens when you
use vectors (whose last coordinate is 0) instead.

::: important

**Note**. Affine transforms can be decomposed into a product of scale, rotations, translations, and *shears*
(which we won't cover). Furthermore, in general an affine transformation matrix will always have a last row of
$\begin{bmatrix} 0 & \dots & 0 & 1 \end{bmatrix}$. This means that in 2D you can represent typical (affine) transforms
with just 6 floats (two
for the new x-basis vector, two for the new y-basis vector, and two for a translation). Finally, transforms
which have a final row which is different from the aforementioned are the more general *projective
transformations*, which are out of scope for this course.

:::

#### Triangles

A *convex combination* of $n$ points $\mathbf{p}_1, \dots, \mathbf{p}_n$ is the
combination $\sum_{i = 1}^n \alpha_i \mathbf{p}_i$ such that
each $\alpha_i \geq 0$ and $\sum_{i = 1}^n \alpha_i = 1$. Geometrically, a convex combination is a point which is
“inbetween”
the original points.

A *triangle* is the set of all convex combinations between three specific, ordered
points $\mathbf{p_1}, \mathbf{p_2}, \mathbf{p_3}$.
Furthermore, in graphics a triangle has a “front side” and a “back side”. The front side is defined (by
convention) to be the side from which the sequence $\mathbf{p_1} \to \mathbf{p_2} \to \mathbf{p_3}$ appears (“winds”) in
counterclockwise
order.

Triangles are the fundamental geometric building block for rasterizers. Triangle meshes (which are used to
define the geometry of likely every character you have ever seen in a 3D video game) are so-called because
they are just collections of triangles which approximate a true underlying surface. Why triangles and not
quads? Triangles are the simplest possible polygon, and in particular, a non-degenerate triangle is **guaranteed to
identify a plane** (i.e., its points are coplanar). This is not the case for a quad (e.g.,
take a square piece of paper and fold it along a diagonal).

For this reason, to define a quad, we use two coplanar triangles (e.g., one corresponding to the top-left of
the quad, the other for the bottom-right).

### Textures

Just like triangle meshes can be used to approximate arbitrarily detailed surfaces, we also need a way to
approximate arbitrarily detailed images. In computers, this is achieved with raster bitmap images — the
resolution of the bitmap defines the granularity of the approximation, and is proportional to the memory cost
of storing the image.

In graphics, there are many types of images we might want to map over the surface of a triangle mesh. Color (albedo),
transparency masks, normal/bump maps, specular maps, and emission maps, are some of the images we
might want to display on surfaces to have fine-grained control of the appearance of meshes in a scene.

In our case, the sprite only requires a simple quad mesh of two triangles, but the question remains of how to
“pin” specific points on the mesh to specific points in our texture space (called interchangeably texture or
uv coordinates)?

The answer is: we associate each corner vertex $\mathbf{p}_i, i \in \{1, 2, 3\}$ of each triangle to a 2D UV-coordinate
$(u_i, v_i)$ in texture space, and since each point $\mathbf{p}$ in a triangle is a convex combination
of its positions $\mathbf{p} = \sum_{i = 1}^3 \alpha_i \mathbf{p}_i$, we define its corresponding texture coordinate to
be the same convex
combination using the corner UV-coordinates:

$$
(u, v) = \sum_{i = 1}^3 \alpha_i \cdot (u_i, v_i)
$$

The GPU rasterizer automatically handles [+note6] calculating these $\alpha_i$ in a
perspective-correct way in 3D, so as a programmer your only job is making sure to set the correct texture
coordinates for each vertex.

#### Texture interpolation

Generally, once the GPU obtains a $(u, v)$-coordinate in texture space corresponding to $\mathbf{p}$
in model space, $u$ and $v$ are typically not round numbers corresponding to exactly
one pixel in the image buffer. Texture interpolation modes define how to define a “good enough” underlying
continuous image given a discrete bitmap. A pixel stored at index `[y][x]` in the buffer corresponds to
$(u, v) = (x + 0.5, y + 0.5)$ (i.e., the center of the pixel “square”).

- *Nearest neighbor*: always chooses the single “closest” pixel to the $(u, v)$ coordinates. Best for
  pixel art games where “pixel perfect” results are needed, but looks blocky for medium/hi-res games. Fastest
  interpolation mode. Equivalent to viewing the underlying continuous image as piecewise constant.

- *Bilinear interpolation*: Blends linearly from the 4 surrounding point samples. Best when a basic amount of
  “smoothness” is desired in the texture. Equivalent to viewing the underlying continuous image as piecewise
  linear.

  For example, at $(u, v) = (0.6, 1.3)$, this corresponds to position $(0.1, 0.8)$ relative to buffer indices, so
  the surrounding 4 pixels are at `img[y][x] = img[0][0], img[0][1], img[1][0], img[1][1]`. Then in the
  x-direction $\alpha_x = \frac{0.1 - 0}{1 - 0} = 0.1$ and in the y-direction $\alpha_y = \frac{0.8 - 0}{1 - 0} = 0.8$.
  First collapsing the x-direction, we get
  `y0 = (1 - 0.1)*img[0][0] + 0.1*img[0][1]` and `y1 = (1 - 0.1)*img[1][0] + 0.1*img[1][1]` and then
  collapsing along y, the final result is `(1-0.8)*y0 + 0.8*y1`.

- *Bicubic interpolation*: Fits a bicubic function to the surrounding 16 points. Smoothest, but slowest —
  details out of scope.

### Blend modes

Supposing we have RGBA images (whether 3D rendered by our rasterizer, from an image editing software, or just
from the web), the last question is how to *composite* them together.

In this section, we assume all RGBA channels are in $[0, 1] \subset \mathbb{R}$.

#### Alpha compositing

Suppose we have a *source* image we want to composite on top of a *destination* image. If both images are
fully opaque (have an alpha channel of 1), then trivially, the final image is $f (src, dst) = src$. Suppose instead
that the source image is semi-transparent (it has alpha values $< 1$). Then, default alpha “over”
compositor (`sf::BlendAlpha`) is implemented as follows:

$$
output_{RGB} = source_{RGB} \times source_{A} + destination_{RGB} *  (1 - source_{A})
$$

$$
output_{A} = source_{A} + destination_{A} *  (1 - source_{A})
$$

Clearly, this operation is non-commutative (swapping the order of the arguments changes the output). There
exist many different blend modes that achieve different effects. For example, an additive blend mode is given
by:

$$
output_{RGB} = source_{RGB} \times source_{A} + destination_{RGB}
$$

$$
output_{A} = source_{A} + destination_{A}
$$

## Problems

1.
    1. Suppose we use the rotation matrix for 2D space (represented again in homogeneous coordinates):

       $$
       R_\theta = \begin{bmatrix}
       \cos (\theta) & -\sin (\theta) & 0 \\
       \sin (\theta) & \cos (\theta) & 0 \\
       0 & 0 & 1
       \end{bmatrix}
       $$

       with the x-axis pointing right and the y-axis pointing down. Does increasing $\theta$ perform
       a clockwise, or counterclockwise rotation? What if the y-axis points up?

    2. *Designing a basic transform*. Suppose we only wanted to support translations and scaling. In 2D, this
       reduces the degrees of freedom to just four dimensions — two for the scale and two for the
       translation. Here's one way to store such a transform:

       ```cpp
       struct BasicTransform {
           sf::Vector2f scale;
           sf::Vector2f translation;
       };
       ```

       Implement the following methods in `basic_transform.h` (`const` is not indicated for you):

        - A constructor taking custom scale and translation. It should have default arguments corresponding to
          the identity transformation.

        - `sf::Vector2f applyPoint(const sf::Vector2f& p);` which gives the result of applying the transform
          to a point. Both the input and output omit the last homogeneous coordinate.

        - `sf::Vector2f applyVector(const sf::Vector2f& p);` which gives the result of applying the transform
          to a vector. Both the input and output omit the last homogeneous coordinate.

          As an aside, in production code one might have different classes for `Vector` and `Point` (not just
          aliases — overloads do not distinguish between those) such that you could define `operator()()`
          overloads on `BasicTransform` specialized for taking each. [+note1]

        - `bool operator==(const BasicTransform& other)`, which is just an exact comparison operator.

       While the class of transformations spanned by either design is equivalent, think about whether it
       makes more sense to apply the scale or the translation first.

2.
    1. Assume we are in SFML's coordinate system with the y-axis pointing down and the origin at the
       top-left. Furthermore, the suppose the bottom-right of the screen is at point $(800, 600)$.
       Suppose we want a rectangle of width and height exactly half the screen dimensions, centered at the
       center of the screen.

       List out, **in counterclockwise order**, 3 vertex positions for the triangle that is the top-left half
       of the quad, and then 3 vertex positions for the triangle that is the bottom-right half of the quad.

    2. You should have duplicate vertex positions in (a). Using an index buffer (a buffer that stores indices
       into another buffer), propose a way to represent the above quad that does not duplicate vertex
       position information, and that uses less memory. Analyze, in terms of bytes, the memory usage of your
       new scheme vs in (a). You may assume that indices and floats are both 4 bytes. Consider when either
       approach wins (consider the number of times the same vertex is used by distinct triangles). Also
       consider if we used doubles (8 bytes) instead of floats.

    3. Suppose we have assigned **normalized** UV coordinates to the 4 corners of the rectangle:
        - top-left: $(0, 0)$
        - bottom-left: $(0, 1)$
        - bottom-right: $(1, 1)$
        - top-right: $(1, 0)$

       What are the (normalized) UV coordinates corresponding to the screen point $(500, 301)$?

3. *Sprite class*. Complete the TODOs in `sprite.h`, where the skeleton of a `Sprite` class is provided. You
   will use a `sf::VertexArray` to represent the geometry and UV coordinates. It inherits from `sf::Drawable`
   (and hence you can call `window.draw(mVertexArray, renderStates)`).

   A vertex array in SFML is just a thin wrapper around `std::vector<sf::Vertex>`, together with a
   `sf::PrimitiveType`. The latter determines how to interpret the list of vertices. For example,
   `sf::PrimitiveType::Triangles` interprets every 3 consecutive vertices as a triangle to be drawn.

   A `sf::Vertex` is just a struct of 3 things:

    - a position in space (2D),
    - texture coordinates for this vertex (2D) [+note2], and
    - a color, as an alternative to texture coordinates (we will not be using this).

   It is possible to use `sf::PrimitiveType::TriangleStrip` in this case, but for compatibility with a future
   lab, use `sf::PrimitiveType::Triangles` for this lab.

   You can reference a vertex array tutorial
   [here](https://www.sfml-dev.org/tutorials/3.0/graphics/vertex-array).

   The `Sprite` stores a raw pointer to its texture, which is assumed to outlive the sprite. It also stores a
   `mMinPointTex` and `mMaxPointTex`, an AABB into the texture which represents the desired texture
   subrectangle for the sprite to use. By default this is just the whole texture, unless the special
   constructor with custom min/max point is called.

   Furthermore, an `mOrigin` represents the offset, relative to `mMinPointTex`, in texture coordinates, that
   the position of the sprite (stored in the transform) should be at in the texture.

   Finally we make use of our `BasicTransform` to handle scaling and translations.

   We have provided a `mouse.cpp` for you which has testing code. If you've implemented things correctly, you
   should see this:

   <ImageCard
   id="fig-thing"
   image="/static/img/lab8_prep.png"
   title="Figure 1"
   width="256px"
   :center="true"
   />

   Completed prep for Sprite.

   where the sword tracks your cursor. **Your code should work the same regardless if you use the constructor
   line with `texture` or `texture2`**!

## Barycentric Coordinates

Barycentric coordinates allow us to use 2D coordinates $(u, v)$ to parameterize the surface of a
triangle, and they allow us to answer the question:

*How do we find 2D coordinates given an arbitrary point in the triangle? (e.g., even if the triangle was in 3D
space)*

Since a triangle $T$ specified by corner points $\mathbf{a}, \mathbf{b}, \mathbf{c}$ is convex, every point
$\mathbf{p} \in T$ can be represented as a convex combination of the three corners:

$$
\mathbf{p} = w\mathbf{a} + u\mathbf{b} + v\mathbf{c}
$$

where $u + v + w = 1$ and $u, v, w \geq 0$. Because of the constraint $u + v + w = 1$, we have only 2 free
parameters. Without loss of generality we will say $w$ is determined by $u, v$:
$w = 1 - u - v \geq 0$. Thus:

$$
\begin{align*}
\mathbf{p} &= w\mathbf{a} + u\mathbf{b} + v\mathbf{c}\\
&= (1 - u - v)\mathbf{a} + u\mathbf{b} + v\mathbf{c} \\
&= \mathbf{a} + u (\mathbf{b} - \mathbf{a}) + v (\mathbf{c} - \mathbf{a})
\end{align*}
$$

**Important upshot:** This formula has a simple geometric interpretation. Letting $\mathbf{a}$ be a
reference corner, $(\mathbf{b} - \mathbf{a})$ is the vector from the reference corner to $\mathbf{b}$, and
$(\mathbf{c} - \mathbf{a})$ is the vector from the reference corner to $\mathbf{c}$. Then $\mathbf{p}$ is just
the reference corner plus some percent distance towards corner $\mathbf{b}$ and plus some percent distance
towards corner $\mathbf{c}$. $(u, v)$ are just those percentages.

If we represent in world space $\mathbf{p} = \begin{bmatrix} p_1 \\ p_2 \end{bmatrix}$ and similarly for the corners, we
can write this in matrix
form:

$$
\begin{align*}
\underbrace{\begin{bmatrix}
b_1 - a_1 & c_1 - a_1 \\
b_2 - a_2 & c_2 - a_2
\end{bmatrix}}_{A} \begin{bmatrix}
u \\ v
\end{bmatrix}
&=\begin{bmatrix}
p_1 - a_1 \\ p_2 - a_2
\end{bmatrix}
\end{align*}
$$

You should recognize this as a linear system in 2 variables. Assuming the triangle is not degenerate,
$A$ is full rank and hence we can solve:

$$
\begin{align*}
\begin{bmatrix}
u \\ v
\end{bmatrix} &= A^{-1}\begin{bmatrix}
p_1 - a_1 \\ p_2 - a_2
\end{bmatrix} = A^{-1} (\mathbf{p} - \mathbf{a})
\end{align*}
$$

In practice, in 2D this system is solved with Cramer's rule. This is left as an exercise to the reader.

[+note1]: i.e., `Vector2D operator()(const Vector2D&)` and `Point2D operator()(const Point2D&)`

[+note2]: The `sf::RenderStates` passed into the draw call determines whether these are normalized or pixel coordinates.
The render states also determine the blend mode and the used texture. See documentation:
[here](https://www.sfml-dev.org/documentation/3.0.0/structsf_1_1RenderStates.html).

[+note3]: See [here](https://web.archive.org/web/20250117080257/https://jcmit.net/memoryprice.htm) for memory prices.

[+note4]: You can see some gameplay footage of this [here](https://www.youtube.com/watch?v=bDLj1Qcy9Eo).

[+note5]: The 5 sprites supported by the Atari 2600 were all single-colour, which furthermore had limitations on size.

[+note6]: Those interested should look up “barycentric coordinates” and “perspective correct texture mapping”. A
  thorough explanation of barycentric coordinates is given in appendix [Barycentric
  Coordinates](#barycentric-coordinates).
