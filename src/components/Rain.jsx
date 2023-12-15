import React, { useEffect, useState } from 'react';
import Sketch from "react-p5"

const isMobile = window.innerWidth <= 800;


const SETTINGS = {
    dropNumber: 200,               
    dropLength: 30,                 
    globalSpeedMultiplier: 5,      

    mouseInteractionRadius: isMobile ? 0 : 100,  
    interactionStepDivider: 10,     

    useUmbrella: false,              
    mouseUmbrellaShadow: 0.8,       

    windSpeed: -10,                 

    dropColor: {                    
        r: 220,
        g: 220,
        b: 255,
        baseAlpha: 32
    }
}

export const InteractiveRain = (props) => {

    const drops = [];

    const [windowDimensions, setWindowDimensions] = useState({
        width: window.innerWidth,
        height: window.innerHeight
    });

    const setupFunction = (p5, canvasParentRef) => {

        p5.createCanvas(windowDimensions.width, windowDimensions.height).parent(canvasParentRef)

        for (let i = 0; i < SETTINGS.dropNumber; i++) {
            drops.push({
                x: Math.round(Math.random() * windowDimensions.width),
                y: Math.round(Math.random() * windowDimensions.height),
                speed: (Math.random() * 5) + 1,
                seed: Math.random() * 1000
            });
        }

        p5.noFill();
    };

    const drawFunction = (p5) => {
        p5.clear()
        p5.background(0, 0);
        
        drops.forEach(drop => {
            
            p5.stroke(
                SETTINGS.dropColor.r,
                SETTINGS.dropColor.g,
                SETTINGS.dropColor.b,
                SETTINGS.dropColor.baseAlpha * drop.speed / 5
            )

            const processedDrop = processDrop(drop, p5.mouseX, p5.mouseY);

            if (processedDrop.length === 2) {
                p5.line(processedDrop[0].x, processedDrop[0].y, processedDrop[1].x, processedDrop[1].y);
            } else {

                p5.beginShape();
                p5.curveVertex(processedDrop[0].x, processedDrop[0].y);
                for (let i = 0; i < processedDrop.length - 1; i++) {
                    p5.curveVertex(processedDrop[i].x, processedDrop[i].y);
                }
                p5.curveVertex(processedDrop[processedDrop.length - 1].x, processedDrop[processedDrop.length - 1].y);
                p5.endShape();

            }
        });

        updateDrops(drops);
    }

    useEffect(() => {
        const handleResize = () => {
            setWindowDimensions({
                width: window.innerWidth,
                height: window.innerHeight
            });
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return (
        <Sketch style={{position: "absolute", top:"0", left: "0", zIndex: -1}} setup={setupFunction} draw={drawFunction} />
    );
}

const updateDrops = (drops) => {

    drops.forEach(drop => {
        drop.y += drop.speed * SETTINGS.globalSpeedMultiplier;
        if (drop.y > window.innerHeight) {
            drop.y = 0;
        }

        if (drop.y < -SETTINGS.dropLength) {
            drop.y = window.innerHeight;
        }
    });
}

const processDrop = (drop, mouseX, mouseY) => {

    const points = []

    const initialPoint = {
        x: drop.x,
        y: drop.y
    }
    const endPoint = {
        x: drop.x,
        y: drop.y + SETTINGS.dropLength + (SETTINGS.dropLength * 0.5 * drop.speed)
    }

    if (Math.abs(drop.x - mouseX) > SETTINGS.mouseInteractionRadius) {
        points.push(initialPoint);
        points.push(endPoint);
    } else {

        const steps = (endPoint.y - initialPoint.y) / SETTINGS.interactionStepDivider;

        const stepLength = (endPoint.y - initialPoint.y) / steps

        for (let currentY = initialPoint.y; currentY < endPoint.y; currentY += stepLength) {

            if (distance(initialPoint.x, currentY, mouseX, mouseY) > SETTINGS.mouseInteractionRadius) {
                if (currentY < mouseY) {    
                    points.push({x: initialPoint.x, y: currentY});
                } else {                    

                    let calculatedX = umbrellaModifyX(initialPoint.x, mouseX, drop.seed);
                    const lastX = points.length > 0 ? points[points.length - 1].x : initialPoint.x;

                    const xDiff = Math.abs(calculatedX - lastX);
                    if (xDiff > 20) {
                    }

                    points.push({
                        x: calculatedX,
                        y: currentY
                    });
                }
            } else {

                let translatedX = calculateCircleX(Math.round(currentY) - mouseY);
                translatedX = (
                    initialPoint.x > mouseX
                        ? mouseX + translatedX + noiseOffset(drop.seed)
                        : mouseX - translatedX - noiseOffset(drop.seed)
                )

                if (currentY > mouseY) {
                    translatedX = umbrellaModifyX(
                        translatedX,
                        mouseX,
                        drop.seed
                    );
                }

                points.push({
                    x: translatedX,
                    y: currentY
                })
            }
        }
    }

    points.forEach((point, index) => {
        point.x = windOffset(point.x, index * (1 / points.length));
    });

    return points;
}

const distance = (x1, y1, x2, y2) => {
    const a = x1 - x2;
    const b = y1 - y2;

    return Math.sqrt(a*a + b*b);
}

const calculateCircleX = (y) => {

    const x = Math.floor(
        Math.sqrt(Math.pow(SETTINGS.mouseInteractionRadius, 2) - Math.pow(Math.floor(y), 2))
    );

    return x;
}

const umbrellaModifyX = (x, mouseX, seed) => {
    if (!SETTINGS.useUmbrella) return x;

    let value = x;
    if (Math.abs(x - mouseX) < SETTINGS.mouseUmbrellaShadow * SETTINGS.mouseInteractionRadius) {
        value = x > mouseX
            ? (mouseX + SETTINGS.mouseUmbrellaShadow * SETTINGS.mouseInteractionRadius) + noiseOffset(seed)
            : (mouseX - SETTINGS.mouseUmbrellaShadow * SETTINGS.mouseInteractionRadius) - noiseOffset(seed);
    }

    return value;
}

const noiseOffset = (seed) => {
    return Math.round(Math.cos(seed) * 4);
}

const windOffset = (x, distanceFromOrigin) => {
    return x + distanceFromOrigin * SETTINGS.windSpeed;
}

const frictionOffset = (x, distanceFromOrigin) => {
    return Math.round(Math.cos(x + distanceFromOrigin) * SETTINGS.windSpeed);
}