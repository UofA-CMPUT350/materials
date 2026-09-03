# SFML Prerequisite Knowledge

## Basics

### Window

- *Tutorial: [Link](https://www.sfml-dev.org/tutorials/3.0/window/window/#opening-a-window)*
- *Documentation: [Window](https://www.sfml-dev.org/documentation/3.0.1/classsf_1_1Window.html)*
- *Documentation: [RenderWindow](https://www.sfml-dev.org/documentation/3.0.1/classsf_1_1RenderWindow.html)*

In SFML (and similarly in other libraries), windows handle three core features:

1. Creating and managing windows,
2. Creating and exposing a graphics context (e.g., an OpenGL or Vulkan context) tied to the window, and
3. Handling user input to the window.

While this appears as if overloading responsibilities on a single class (i.e., a violation of the Single Responsibility
Principle), these three functionalities are deeply intertwined. A window needs a graphics context because it inherently
has a surface which needs to be rendered to. Similarly, a window needs to be able to handle inputs because inputs are
sent to an “active” or focused window. The window handles the responsibility of facilitating a cross-platform
abstraction for multimedia applications.

In SFML, you can create a `sf::Window` with width 800 pixels and height 600 pixels like so:

``` cpp
sf::Window window(sf::VideoMode(sf::Vector2u(800, 600)), "My Window Title");
```

There are optional third and fourth parameters to the constructor:

- A bitwise OR of the possible `sf::Style` enums, which lets you choose whether, e.g., the border is resizable, if the
  close button exists, etc.
- `sf::State`, where you can choose between `sf::State::Windowed` and `sf::State::Fullscreen`.

**(Important)**: Finally, if you want to use SFML’s 2D drawing features (instead of working directly with OpenGL), you
should use `sf::RenderWindow`, which extends `sf::Window` with the ability to draw `sf::Shape`s. The constructor looks
the same:

``` cpp
sf::RenderWindow window(sf::VideoMode(sf::Vector2u(800, 600)), "My Window Title");
```

and now you can call:

``` cpp
window.draw(shape); // where shape is an sf::Shape.
```

*Note: it is strongly recommended to create your windows on the main thread. In macOS, this
is [strictly required](https://www.sfml-dev.org/tutorials/3.0/window/window/#on-macos-windows-and-events-must-be-managed-in-the-main-thread).*

### Events

- *Documentation: [Link](https://www.sfml-dev.org/documentation/3.0.0/classsf_1_1Event.html)*
- *Tutorial: [Link](https://www.sfml-dev.org/tutorials/3.0/window/events/)*

SFML uses the type `sf::Event` to represent any kind of event. Internally, it stores a `std::variant`
(i.e., a `union` with a tag) of all possible *specific* event types. These include:

- Window events like closing and resizing the window (`sf::Event::Closed`, `sf::Event::Resized`)
- Keyboard press and release events (`sf::Event::KeyPressed`, `sf::Event::KeyReleased`)
- Mouse events (`sf::Event::MouseMoved`, `sf::Event::MouseButtonPressed`, `sf::Event::MouseButtonReleased`)
- and more...

Because `sf::Event` is a common-ground `union` of all events, we can then poll for all unprocessed events *of any type*
with

``` cpp
while (const std::optional<sf::Event> event = window.pollEvent()) {
    // handle events here...
}
```

*Note: `window.pollEvent()` must be called in the same thead that created the window.*

Within this loop, how do we know *specifically* what type of event we have? SFML provides two special *method templates*
on `sf::Event` to help us determine this:

1. `template <typename T> sf::Event::getIf`, which returns a pointer to the specific event subtype if the `sf::Event`
   actually stores the specific event subtype `T`, else it returns a `nullptr`.
2. `template <typename T> sf::Event::is`, which returns `true` if the `sf::Event` actually represents a specific event
   type `T`, else it returns `false`.

If you just want to check that an event exists of type `T`, use `sf::Event::is<T>`. If you actually need to use the
underlying event object, use `sf::Event::getIf<T>()`.

For example:

``` cpp
// if there are no more events, window.pollEvent returns an empty optional. 
// Optionals have a conversion operator to bool which return true iff they are nonempty.
while (const std::optional event = window.pollEvent()) {
    // Option (1) where we do not need info about the event
    if (event->is<sf::Event::Close>()) {
        std::cout << "User closed the window!" << std::endl;
    }
    // Option (2) where we are interested about the data of the event,
    // such as the new resized window width and height.
    // What you see below is a trick to set a local variable,
    // and check the boolean conversion of that local variable in one line.
    // nullptr evaluates to false, and all other pointer values evaluate to true.
    // Thus, if the event is a resized event, the if condition is true!
    else if (const auto* resized = event->getIf<sf::Event::Resized>()) {
        std::cout << "new width: " << resized->size.x << std::endl;
        std::cout << "new height: " << resized->size.y << std::endl;
    }
}
```

### Keyboard events

In this part we will look at three event types:

1. `sf::Event::KeyPressed`, which is triggered when a keyboard key is pressed.
2. `sf::Event::KeyReleased`, which is triggered when a keyboard key is released.
3. `sf::Event::TextEntered`, which is triggered when a character has been typed, such as in a textbox.

#### KeyPressed/KeyReleased

- *Tutorial: [Link](https://www.sfml-dev.org/tutorials/3.0/window/events/#the-keypressed-and-keyreleased-events)*
- *Documentation: [KeyPressed](https://www.sfml-dev.org/documentation/3.0.0/structsf_1_1Event_1_1KeyPressed.html)*
- *Documentation: [KeyReleased](https://www.sfml-dev.org/documentation/3.0.0/structsf_1_1Event_1_1KeyReleased.html)*

A `KeyPressed` event is triggered literally every time you hit a key on your keyboard (even those which do not produce
text, like your left Shift key). If a key is held down, by default SFML will generate multiple `KeyPressed` events after
a delay [+delay]. It is possible to disable repeated `KeyPressed` events by calling `window.setKeyRepeatEnabled(false)`.

[+delay]: After the same delay that occurs when you hold a letter in a textbox.

However, only one `KeyReleased` event is generated when the user releases the key.

*Be careful about these details, and consider any changes to your code knowing that multiple `KeyPressed` events can be
generated from a single press of the key.*

Once we get a `KeyPressed` event, we will want to check what key on the keyboard was pressed. This is a good use case
for `sf::Event::getIf<T>()`.

Individual keys on your keyboard are associated with both a “key code” (`sf::Keyboard::Key` enum) and a “scancode”
(`sf::Keyboard::Scan` enum). In a `KeyPressed` struct, the key code is stored in the `code` member, and the scancode is
stored in the `scancode` member. These are not the same things in general:

- A “key code” refers to the **logical** character located at a key, <u>depending on your OS-interpreted keyboard
  layout</u>. This means that for example, if you have OS-level re-mappings (e.g., you told your OS your keyboard layout
  is AZERTY), then the key code accounts for this. If I pressed the “A” key in an AZERTY layout keyboard, I would get a
  key code of `sf::Keyboard::Key::A`.
  <ImageCard image="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/KB_France.svg/1280px-KB_France.svg.png"
  title="Figure 1: An AZERTY layout keyboard"
  />
- A “scancode” refers to the layout-independent **physical** positions of keys on a keyboard. This means that it ignores
  all OS-level re-mappings — the keys with the WASD scancodes are always located exactly where you always place your
  left-hand fingers for your FPS games, regardless of if the letter on the keyboard says something else or if the user
  has custom mappings.

  However, this being the case, we still need a “standard” reference layout so that we can associate each scancode with
  a name. SFML uses the convention of the US QWERTY layout — each scancode is the letter on the key that *would* be
  there if you were using a US QWERTY layout keyboard.

  If I pressed the “A” key in an AZERTY layout keyboard, I would get `sf::Keyboard::Scan::Q`.

Use scancodes when the physical location of the key is important (e.g., `WASD` for movement). Use key codes when you
actually want a specific logical key to map to an action (e.g., `I` for inventory).

Here’s an example of using scancodes to detect if the user pressed the Escape key inside the event handling loop:

``` cpp
while (const std::optional event = window.pollEvent()) {
    if (const auto *keyPressed = event->getIf<sf::Event::KeyPressed>()) {
        // We know a key was pressed, lets check if it was the escape key!
        if (keyPressed->scancode == sf::Keyboard::Scan::Escape) {
            std::cout << "Escape key was pressed" << std::endl;
            // probably exit your program here:
            window.close();
        }
    }
}
```

#### TextEntered

- *Tutorial: [Link](https://www.sfml-dev.org/tutorials/3.0/window/events/#the-textentered-event)*
- *Documentation: [Link](https://www.sfml-dev.org/documentation/3.0.0/structsf_1_1Event_1_1TextEntered.html)*

The `sf::Event::TextEntered` event is triggered when a character is actually outputted (e.g. as if you were typing into
a textbox). Hitting `LShift` and then `A` produces two `KeyPressed` events, but one `TextEntered` event corresponding to
capital `A` (and omitting the shift produces a lowercase `A`). The `TextEntered` event has only one member `unicode`,
corresponding to the Unicode of the produced character. For example:

``` cpp
if (const auto* textEntered = event->getIf<sf::Event::TextEntered>())
{
    if (textEntered->unicode < 128)
        std::cout << "ASCII character typed: " << static_cast<char>(textEntered->unicode) << std::endl;
}
```

Prefer this event type for when you want to take user text input.

## SFML geometric primitives and shapes

In this lab we’ll be using `sf::Shape`, which is a base class for `sf::RectangleShape` and `sf::CircleShape`. In SFML,
`Shape` types come with attributes for a geometric transform (position, rotation, translation), for drawing (texture,
color), and other features (e.g., collision bounds). We will be primarily concerned with the drawing and the collision
detection aspects. We begin by going over some geometric primitives and then cover shapes (specifically, circles and
rectangles) in SFML.

### Vectors

*Documentation: [Link](https://www.sfml-dev.org/documentation/3.0.0/classsf_1_1Vector2.html)*

SFML comes with a 2D vector class template (not to be confused with the dynamic array in the standard library!). This is
found in `sf::Vector2<T>`. The most common specializations have type aliases:

- `sf::Vector2<float>` is aliased as `sf::Vector2f`.
- `sf::Vector2<int>` is aliased as `sf::Vector2i`.
- `sf::Vector2<unsigned int>` is aliased as `sf::Vector2u`.

Each one has two components of the corresponding template parameter type `T`, `T x` and `T y`. `sf::Vector2<T>` is used
throughout SFML to represent... well, 2D points. For example,

``` cpp
sf::Vector2u windowSize = window.getSize();
std::cout << "x = " << window_size.x << ", y = " << window_size.y << std::endl;
```

`Vector2<T>` also comes with some methods you may find useful:

- `length()`, which returns a `T` given by: $\Vert\vec{v} \Vert = \sqrt{v_x^2 + v_y^2}$
- `lengthSquared()`, which also returns a `T` given by: $\Vert \vec{v}\Vert^2 = v_x^2 + v_y^2$. This is useful when
  you want to do comparisons between lengths without incurring an expensive `std::sqrt`.
- `dot(const Vector2<T>& other)`, which returns a `T` corresponding to the elementwise product and then summation:
  $$\mathrm{dot} (\vec{u}, \vec{v}) := \vec{u} \cdot \vec{v} = u_x \cdot v_x + u_y \cdot v_y$$
  Note that $\Vert\vec{v} \Vert = \sqrt{\vec{v} \cdot \vec{v}}$. Furthermore, recall that
  $$\vec{u} \cdot \vec{v} = \Vert\vec{u}\Vert\Vert\vec{v}\Vert\cos{\theta}$$
  where $\theta$ is (either) angle between $\vec{u}$ and $\vec{v}$ in the plane spanned by the two vectors. In
  particular, this implies that if they are both unit vectors, i.e. $\Vert\vec{u}\Vert\ = \Vert\vec{v}\Vert\ = 1$, we
  can call the vectors $\hat{u}$ and $\hat{v}$ and
  $$\hat{u} \cdot \hat{v} = \cos (\theta)$$
- Other useful methods include the element-addition and multiplication (and their inverses). Unfortunately, doing scalar
  multiplication or adding a constant scalar to each element is not provided; you may write your own helper functions
  for those. There is more which can be found in the documentation link above.

### Axis-aligned bounding boxes (AABBs)

*Documentation: [Link](https://www.sfml-dev.org/documentation/3.0.0/classsf_1_1Rect.html)*

In SFML, axis-aligned bounding boxes (AABBs) are provided by the `sf::Rect<T>` class template (usually you would use a
`sf::FloatRect`, defined as `sf::Rect<float>`). An AABB is a (line in 1D, rectangle in 2D, rectangular prism in 3D,
etc.) whose edges are all parallel to an axis in the coordinate system you are working in. An AABB (in any dimension)
can be represented as a `minPoint` and a `maxPoint`, or as a `minPoint` and a `size`. All of these fields are
tuples/vectors/points of the same length as the dimensionality of the space. In either case, `minPoint` is the position
of the “smallest corner” of the rectangle along each axis (according to the coordinate system). In SFML, the `FloatRect`
has two public fields: `sf::Vector2f position` (i.e., `minPoint`), and `sf::Vector2f size` (i.e.,
`maxPoint - minPoint`). The appeal of AABBs is that:

- It is trivial to compute if two AABBs intersect (collide) or not.
- They are generally reasonable approximation of true shapes/volumes (as opposed to, e.g., spheres, for elongated
  shapes).
- It is typically trivial to determine the AABB of a set of points, or of a shape/mesh.

which makes AABBs an excellent candidate for use during *broad phase* collision detection — namely, when you want to
cheaply/quickly narrow down candidates for finer-grained (*narrow phase*) collision detection so that you can do
expensive true collision detection with fewer objects.

In SFML, all `sf::Shape`s have two methods which return `sf::FloatRect`s:

- `FloatRect getLocalBounds()`, which ignores the global transformation stored by the shape (e.g., ignoring position,
  rotation, scale) and returns the bounding box relative to the shape’s *local coordinates*.
- `FloatRect getGlobalBounds()`, which accounts for the transformation and returns the bounding box relative to the
  screen or world coordinates.

Given two AABBs `sf::FloatRect rect1` and `sf::FloatRect rect2`, you can check if they intersect using
`rect1.findIntersection(rect2)`. Note that in SFML, AABB’s are “open” at their max points

``` cpp
sf::FloatRect rect1({0.f, 0.f}, {5.f, 6.f}); // constructor takes position, then size
sf::FloatRect rect2({5.f, 6.f}, {1.f, 1.f}); // positioned right at the bottom-right corner of rect1

// note: in the above, you can also do:
// sf::FloatRect rect1(sf::Vector2f(0.f, 0.f), sf::Vector2f(5.f, 6.f));

// rect1 is [0, 5) x [0, 6)
// rect2 is [5, 1) x [6, 1)

std::optional<sf::FloatRect> result = rect1.findIntersection(rect2);
// since rect1 does not intersect rect2, result is an empty optional, which can implicitly 
// be converted to a false bool:
if (rect1.findIntersection(rect2)) {
    // won't fire unless rect1 intersects rect2; here it won't.
}
// If they did intersect, you'd get the rectangle that makes up the intersection between the two
// rectangles in result.value()
```

### Rectangles

*Documentation: [Link](https://www.sfml-dev.org/documentation/3.0.0/classsf_1_1RectangleShape.html)*

A `sf::RectangleShape` is a subtype of `sf::Shape`, and hence inherits a transformation and the ability to be drawn with
`window.draw(rectShape)`. Its constructor takes a single `sf::Vector2f size`, and you can set its position via its
transform: `rectShape.setPosition(sf::Vector2f position)`.

As all shapes do, you can obtain its bounds on the screen via `rectShape.getGlobalBounds()`, which returns a
`sf::FloatRect` with `position` as the top-left $(x, y)$ of the rectangle in screen coordinates, and
`size` $(\mathrm{width}, \mathrm{height})$, the size in screen coordinates. If you rotate the rectangle, this bounding
rectangle may no longer be tight surrounding the actual shape.

You can access a `Rectangle`’s position via the getter inherited from its base `sf::Transformable` class:
`sf::Vector2f = rectShape.getPosition();`

### Circles

*Documentation: [Link](https://www.sfml-dev.org/documentation/3.0.0/classsf_1_1CircleShape.html)*

A `sf::CircleShape` can also be drawn (e.g., `circleShape.setFillColor(sf::Color::Red)`, `window.draw(circleShape)`) and
transformed (`circleShape.setPosition(circleShape.getPosition() + sf::Vector2f{2.f, 3.f})`) like all `sf::Shape`s.

You can set the circle’s radius by passing a `float` like:

``` cpp
circleShape.setRadius(5.f);
```

And as with all `sf::Shape`s, you set its position via its inherited method as a `sf::Transformable`:

``` cpp
circleShape.setPosition({1.f, 3.f}); // sets center to x = 1, y = 3.
// as you might expect, circleShape also has .getPosition(), inherited from sf::Transformable.
```

Note that by default, all `sf::Shape`s have their local origin set at $(0, 0)$ — i.e., here, the top-left corner of the
box enclosing the circle. This can make positions confusing. You can set the position to be the position of the circle’s
center via `circle.setOrigin(circle.getRadius(), circle.getRadius())`.

#### Circle-circle collision detection

Suppose you have two circles defined by a position and radius: $C_1 = (\vec{p}_1, r_1)$, $C_2 = (\vec{p}_2, r_2)$.
Two (filled) circles intersect (overlap) iff the distance between their centers is less than or equal to the sum of
their radii:

``` cpp
bool circlesIntersect(const sf::CircleShape& c1, const sf::CircleShape& c2) {
    return (c2.getPosition() - c1.getPosition()).length() <= c1.getRadius() + c2.getRadius();
}
```

## Sounds

- *Tutorial: [Link](https://sfml-dev.org/tutorials/3.0/audio/sounds/)*
- *Documentation: [SoundBuffer](https://www.sfml-dev.org/documentation/3.0.1/classsf_1_1SoundBuffer.html)*
- *Documentation: [Sound](https://www.sfml-dev.org/documentation/3.0.1/classsf_1_1Sound.html)*

SFML has two classes which help us handle sounds:

1. `sf::SoundBuffer`, which stores the sound data in memory, and
2. `sf::Sound`, a lightweight class which plays the sound loaded from a `sf::SoundBuffer`

This setup is used because you can have multiple independent `sf::Sound`s which all reference the same
`sf::SoundBuffer`.

We initialize a `sf::SoundBuffer` by giving it a filepath. This is technically a `std::filesystem::path`, but the
filepath can be constructed implicitly from a string type. You have two ways to load from the file. Here’s one way:

``` cpp
sf::SoundBuffer buffer;
// loadFromFile will return true if it succeeds, false otherwise
if (!buffer.loadFromFile("sound.wav")) { 
    // failed to load sound file, handle here:
    std::cerr << "Error loading file\n";
}
```

If you’re comfortable with exceptions already, you can load directly in the constructor, which will throw a
`sf::Exception` if and only if it fails:

``` cpp
// An sf::Exception is thrown if this fails.
sf::SoundBuffer buffer("sound.wav");
```

Once we’ve loaded your `sf::SoundBuffer`, we can construct an `sf::Sound`, and manually play the sound at our
command!

``` cpp
sf::Sound sound(buffer);
// Play the sound!
sound.play();
```

SFML supports loading sound files of type

- WAV (PCM only),
- OGG/Vorbis,
- FLAC, and
- MP3.

## Clocks and time

- *Tutorial: [Link](https://www.sfml-dev.org/tutorials/3.0/system/time/)*
- *Documentation: [Clock](https://www.sfml-dev.org/documentation/3.0.0/classsf_1_1Clock.html)*
- *Documentation: [Time](https://www.sfml-dev.org/documentation/3.0.0/classsf_1_1Time.html)*

SFML was developed before `std::chrono` ([reference](https://en.cppreference.com/w/cpp/chrono.html)) was standardized in
C++11. Prior to this, C++ did not have a standard, cross-platform time-tracking API that was suitable for games. In
particular, the only function from C which tracked wall-clock time was `time()`, which typically has a 1-second
resolution (not granular enough for millisecond or microsecond measurements we need for frames). In general, we
recommend now using `std::chrono` for measuring time — in fact, `sf::Time` is implemented with
`std::chrono::microseconds` — but for this lab, `SFML`’s `sf::Clock` will be sufficient.

The `sf::Time` class represents a time period (i.e., elapsed time between two events). From an `sf::Time` we can obtain
the elapsed duration as seconds, milliseconds, or microseconds:

``` cpp
sf::Time duration = /* to be seen */;
float elapsedSeconds = duration.asSeconds();
int elapsedMilliseconds = duration.asMilliseconds();
long long elapsedMicroseconds = duration.asMicroseconds();
```

You can also convert `sf::Time` to `std::chrono::microseconds` to go back to the standard library with
`duration.toDuration()`.

Now, to actually obtain `sf::Time`, construct an `sf::Clock`:

``` cpp
sf::Clock clock; // begins measuring once constructed.

// Lets check how much time has currently elapsed, then reset back to zero
sf::Time elapsed1 = clock.getElapsedTime();
std::cout << elapsed1.asSeconds() << " seconds have passed since clock created" << std::endl;
clock.restart();

// Check the clock again
sf::Time elapsed2 = clock.getElapsedTime();
std::cout << elapsed2.asSeconds() << " seconds have passed since clock restarted" << std::endl;

// Stop the clock, check if its running, then reset it (which pauses it)
clock.stop(); 
std::cout << std::boolalpha << clock.isRunning() << std::endl;
clock.reset(); // resets elapsed time to zero AND pauses the clock.

// Start the clock again
clock.start(); 
sf::Time elapsed3 = clock.getElapsedTime();
std::cout << elapsed3.asSeconds() << " seconds have passed since clock started" << std::endl;
```

## The Game Loop

Games follow a standard loop:

``` cpp
for (;;) {
    handleInputs();
    updateState();
    render();
}
```

In SFML, this looks something like:

``` cpp
while (window.isOpen()) {
    // Handle inputs
    while (const std::optional<sf::Event> event = window.pollEvent()) {
        if (event->is<sf::Event::Closed>()) {
            window.close();
        } else if (/* other input types */) {
            // ... handle ...
        }
    }
    // Simulate the game rules and update the state here...
    // e.g., by running your systems...
    // ...
    
    // Render the current view of the world
    window.clear(sf::Color::Black); // clear the previous rendering 
    for (/* renderable object in world */) {
        window.draw(object);
    }
    window.display(); // show frame
}
```
