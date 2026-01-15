#!/usr/bin/env python3
"""
Generate app icons and splash screen for Two Cups app.
Design: Two cups leaning toward each other, representing connection.
"""

from PIL import Image, ImageDraw
import os
import math

# Theme colors from the app
COLORS = {
    'primary': '#8B5CF6',      # Purple
    'primaryLight': '#A78BFA',
    'gold': '#FFD700',          # Cup filled color
    'background': '#0F0F0F',    # Dark background
    'gem': '#A855F7',
}

def hex_to_rgb(hex_color):
    """Convert hex color to RGB tuple."""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def draw_cup(draw, center_x, center_y, size, color, rotation=0):
    """
    Draw a simplified cup shape.
    The cup is a trapezoid (wider at top) with a small handle.
    """
    # Cup dimensions
    top_width = size * 0.8
    bottom_width = size * 0.5
    height = size * 0.9

    # Calculate corners based on rotation
    # For simplicity, we'll draw cups straight and handle rotation via positioning

    # Cup body (trapezoid) - points: top-left, top-right, bottom-right, bottom-left
    half_top = top_width / 2
    half_bottom = bottom_width / 2
    half_height = height / 2

    # Apply rotation offset to center
    offset_x = math.sin(math.radians(rotation)) * size * 0.1
    offset_y = -abs(math.cos(math.radians(rotation)) * size * 0.05)

    cx = center_x + offset_x
    cy = center_y + offset_y

    # Cup body points
    points = [
        (cx - half_top, cy - half_height),      # top-left
        (cx + half_top, cy - half_height),      # top-right
        (cx + half_bottom, cy + half_height),   # bottom-right
        (cx - half_bottom, cy + half_height),   # bottom-left
    ]

    # Apply rotation to points
    if rotation != 0:
        rotated_points = []
        rad = math.radians(rotation)
        for px, py in points:
            # Translate to origin
            tx, ty = px - center_x, py - center_y
            # Rotate
            rx = tx * math.cos(rad) - ty * math.sin(rad)
            ry = tx * math.sin(rad) + ty * math.cos(rad)
            # Translate back
            rotated_points.append((rx + center_x, ry + center_y))
        points = rotated_points

    rgb_color = hex_to_rgb(color)
    draw.polygon(points, fill=rgb_color)

    # Cup rim (ellipse at top) - makes it look more 3D
    rim_width = top_width
    rim_height = size * 0.15

    # Calculate rim position (at top of cup)
    rim_center_x = center_x + offset_x
    rim_center_y = center_y - half_height + offset_y

    if rotation != 0:
        # Adjust rim position for rotation
        rad = math.radians(rotation)
        tx, ty = rim_center_x - center_x, rim_center_y - center_y
        rx = tx * math.cos(rad) - ty * math.sin(rad)
        ry = tx * math.sin(rad) + ty * math.cos(rad)
        rim_center_x = rx + center_x
        rim_center_y = ry + center_y

    # Draw a lighter ellipse for the rim
    lighter_color = hex_to_rgb(COLORS['primaryLight'])
    rim_bbox = [
        rim_center_x - rim_width/2,
        rim_center_y - rim_height/2,
        rim_center_x + rim_width/2,
        rim_center_y + rim_height/2
    ]
    draw.ellipse(rim_bbox, fill=lighter_color)


def draw_heart(draw, center_x, center_y, size, color):
    """Draw a small heart between the cups."""
    rgb_color = hex_to_rgb(color)

    # Heart shape using two circles and a triangle
    radius = size * 0.15

    # Two circles for top of heart
    draw.ellipse([
        center_x - radius * 1.5,
        center_y - radius,
        center_x - radius * 0.1,
        center_y + radius * 0.4
    ], fill=rgb_color)

    draw.ellipse([
        center_x + radius * 0.1,
        center_y - radius,
        center_x + radius * 1.5,
        center_y + radius * 0.4
    ], fill=rgb_color)

    # Triangle for bottom of heart
    triangle_points = [
        (center_x - radius * 1.5, center_y),
        (center_x + radius * 1.5, center_y),
        (center_x, center_y + radius * 2)
    ]
    draw.polygon(triangle_points, fill=rgb_color)


def create_icon(size, output_path, include_background=True, padding_ratio=0.15):
    """Create the Two Cups icon at specified size."""
    # Create image
    if include_background:
        img = Image.new('RGBA', (size, size), hex_to_rgb(COLORS['background']) + (255,))
    else:
        img = Image.new('RGBA', (size, size), (0, 0, 0, 0))

    draw = ImageDraw.Draw(img)

    # Calculate cup size based on image size with padding
    padding = size * padding_ratio
    usable_size = size - (padding * 2)
    cup_size = usable_size * 0.4

    center_y = size * 0.52  # Slightly below center

    # Left cup (purple, tilted right)
    left_cup_x = size * 0.35
    draw_cup(draw, left_cup_x, center_y, cup_size, COLORS['primary'], rotation=-10)

    # Right cup (gold, tilted left)
    right_cup_x = size * 0.65
    draw_cup(draw, right_cup_x, center_y, cup_size, COLORS['gold'], rotation=10)

    # Small heart/sparkle between cups
    heart_y = center_y - cup_size * 0.2
    draw_heart(draw, size * 0.5, heart_y, cup_size * 0.3, COLORS['gem'])

    # Save
    img.save(output_path, 'PNG')
    print(f"Created: {output_path} ({size}x{size})")


def create_splash_icon(size, output_path):
    """Create splash screen icon (just the logo, transparent background)."""
    create_icon(size, output_path, include_background=False, padding_ratio=0.05)


def create_favicon(size, output_path):
    """Create favicon with rounded corners."""
    # Create base icon
    img = Image.new('RGBA', (size, size), hex_to_rgb(COLORS['background']) + (255,))
    draw = ImageDraw.Draw(img)

    # Calculate cup size
    cup_size = size * 0.35
    center_y = size * 0.52

    # Left cup (purple)
    draw_cup(draw, size * 0.35, center_y, cup_size, COLORS['primary'], rotation=-8)

    # Right cup (gold)
    draw_cup(draw, size * 0.65, center_y, cup_size, COLORS['gold'], rotation=8)

    # Create rounded corners mask
    mask = Image.new('L', (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    corner_radius = size // 5
    mask_draw.rounded_rectangle([0, 0, size, size], corner_radius, fill=255)

    # Apply mask
    img.putalpha(mask)

    img.save(output_path, 'PNG')
    print(f"Created: {output_path} ({size}x{size})")


def main():
    # Determine output directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    assets_dir = os.path.join(os.path.dirname(script_dir), 'assets')

    print(f"Generating icons to: {assets_dir}")
    print("-" * 40)

    # Ensure assets directory exists
    os.makedirs(assets_dir, exist_ok=True)

    # Generate icons
    # 1. Main icon (1024x1024) - used for iOS and as base
    create_icon(1024, os.path.join(assets_dir, 'icon.png'))

    # 2. Adaptive icon for Android (1024x1024) - foreground only, transparent bg
    create_icon(1024, os.path.join(assets_dir, 'adaptive-icon.png'), include_background=False, padding_ratio=0.2)

    # 3. Splash icon (288x288) - for splash screen, transparent background
    create_splash_icon(288, os.path.join(assets_dir, 'splash-icon.png'))

    # 4. Favicon (48x48) - for web
    create_favicon(48, os.path.join(assets_dir, 'favicon.png'))

    print("-" * 40)
    print("All icons generated successfully!")
    print("\nNext steps:")
    print("1. Update app.json splash backgroundColor to match theme")
    print("2. Run 'npx expo start' to test the new icons")


if __name__ == '__main__':
    main()
