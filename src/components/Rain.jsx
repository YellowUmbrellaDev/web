import React, { useEffect, useState, useRef, useCallback } from 'react';
import Sketch from "react-p5"

const SETTINGS = {
    dropNumber: 200,                                         // [50, 10000)          El número de gotas que se dibujarán en pantalla. A mayor valor, mayor coste computacional
   
    dropLength: 30,                                         // [5, 100]             La longitud base de las gotas. Esta se verá alterada por su velocidad final (las gotas más rápidas serán más largas)
    globalSpeedMultiplier: 5,                               // [0, 15)               La velocidad a la que caen las gotas. Un valor negativo podría generar alteraciones en la gravedad. Usar con cuidado

    interactionStepDivider: 10,                            // [5, 15]              La cantidad de vértices que crea una gota al surfear el paraguas. Valores más altos: gotas más suaves, pero más costosas de procesar.

    useUmbrella: false,                                    // true | false         Si el agua se desvía o no bajo la sombra del ratón

    mouseUmbrellaShadow: 0.8,                              // [0.0, 1.0]           La cantidad de sombra que proyecta el ratón. 0: sin sombra. 1: sombra total.

    windSpeed: -10,                                        // [-10, 10]            Valores negativos: viento hacia la izquierda. Valores positivos: viento hacia la derecha. 0: sin viento. Valores más allá de los límites pueden causar comportamientos erráticos.

    dropColor: {                                           // [0, 255]{4}          El color de las gotas. La opacidad final de la gota se calcula en base a su velocidad (su profundidad en la escena)     
        r: 220,
        g: 220,
        b: 255,
        baseAlpha: 32
    }
}

export const InteractiveRain = (_props) => {
    const dropsRef = useRef([]);
    const p5InstanceRef = useRef(null);
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const [isMobile, setIsMobile] = useState(false);
    const [currentSettings, setCurrentSettings] = useState(SETTINGS);

    const [windowDimensions, setWindowDimensions] = useState({
        width: typeof window !== 'undefined' ? window.innerWidth : 800,
        height: typeof window !== 'undefined' ? window.innerHeight : 600
    });

    // Función para detectar si es móvil
    const checkIfMobile = useCallback(() => {
        const mobile = typeof window !== 'undefined' && window.innerWidth <= 800;
        setIsMobile(mobile);
        return mobile;
    }, []);

    // Actualizar configuración basada en si es móvil
    const updateSettings = useCallback((mobile) => {
        setCurrentSettings(prevSettings => ({
            ...prevSettings,
            mouseInteractionRadius: mobile ? 0 : 100
        }));
    }, []);

    // Función para obtener las dimensiones actuales de la ventana
    const getCurrentDimensions = useCallback(() => {
        if (typeof window === 'undefined') return { width: 800, height: 600 };
        
        return {
            width: window.innerWidth,
            height: Math.max(window.innerHeight, document.documentElement.scrollHeight, document.body.scrollHeight)
        };
    }, []);

    // Función para inicializar las gotas
    const initializeDrops = useCallback((width, height) => {
        const drops = [];
        for (let i = 0; i < currentSettings.dropNumber; i++) {
            drops.push({
                x: Math.round(Math.random() * width),
                y: Math.round(Math.random() * height),
                speed: (Math.random() * 4) + 1,
                seed: Math.random() * 1000
            });
        }
        dropsRef.current = drops;
        return drops;
    }, [currentSettings.dropNumber]);

    // Función para redimensionar el canvas
    const resizeCanvas = useCallback(() => {
        const newDimensions = getCurrentDimensions();
        const mobile = checkIfMobile();
        
        setWindowDimensions(newDimensions);
        updateSettings(mobile);

        if (p5InstanceRef.current && canvasRef.current) {
            // Redimensionar el canvas
            p5InstanceRef.current.resizeCanvas(newDimensions.width, newDimensions.height);
            
            // Reinicializar las gotas para cubrir toda la nueva área
            initializeDrops(newDimensions.width, newDimensions.height);
        }
    }, [getCurrentDimensions, checkIfMobile, updateSettings, initializeDrops]);

    // Hook para manejar el redimensionado de la ventana
    useEffect(() => {
        // Configuración inicial
        const mobile = checkIfMobile();
        updateSettings(mobile);

        const handleResize = () => {
            // Debounce para evitar demasiadas llamadas
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
            
            animationRef.current = requestAnimationFrame(() => {
                resizeCanvas();
            });
        };

        const handleScroll = () => {
            // Actualizar dimensiones en scroll para manejar páginas largas
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
            
            animationRef.current = requestAnimationFrame(() => {
                const newDimensions = getCurrentDimensions();
                if (newDimensions.height !== windowDimensions.height && p5InstanceRef.current) {
                    p5InstanceRef.current.resizeCanvas(newDimensions.width, newDimensions.height);
                    setWindowDimensions(newDimensions);
                }
            });
        };

        const handleVisibilityChange = () => {
            // Reiniciar la animación cuando la página vuelve a ser visible
            if (!document.hidden && p5InstanceRef.current) {
                resizeCanvas();
            }
        };

        const handleTouchStart = (e) => {
            // Prevenir que los toques detengan la animación
            e.preventDefault();
        };

        // Agregar event listeners
        window.addEventListener('resize', handleResize, { passive: true });
        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('orientationchange', handleResize, { passive: true });
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        // Prevenir que los toques interfieran con la animación
        if (mobile) {
            document.addEventListener('touchstart', handleTouchStart, { passive: false });
        }

        // Configuración inicial con un pequeño delay para asegurar que el DOM esté listo
        const initialTimeout = setTimeout(() => {
            resizeCanvas();
        }, 100);

        return () => {
            // Cleanup
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('orientationchange', handleResize);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            
            if (mobile) {
                document.removeEventListener('touchstart', handleTouchStart);
            }
            
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
            
            clearTimeout(initialTimeout);
        };
    }, [resizeCanvas, checkIfMobile, updateSettings, windowDimensions.height, getCurrentDimensions]);

    const setupFunction = useCallback((p5, canvasParentRef) => {
        // Guardar referencia a la instancia de p5
        p5InstanceRef.current = p5;
        
        // Crear el canvas con las dimensiones actuales
        const canvas = p5.createCanvas(windowDimensions.width, windowDimensions.height);
        canvas.parent(canvasParentRef);
        canvasRef.current = canvas;

        // Inicializar las gotas
        initializeDrops(windowDimensions.width, windowDimensions.height);

        p5.noFill();
    }, [windowDimensions.width, windowDimensions.height, initializeDrops]);

    const drawFunction = useCallback((p5) => {
        // Verificar que tenemos la instancia de p5 y las gotas
        if (!p5InstanceRef.current || !dropsRef.current.length) return;
        
        p5.clear();
        p5.background(0, 0);
        
        dropsRef.current.forEach(drop => {
            p5.stroke(
                currentSettings.dropColor.r,
                currentSettings.dropColor.g,
                currentSettings.dropColor.b,
                currentSettings.dropColor.baseAlpha * drop.speed / 5
            );

            const processedDrop = processDrop(drop, p5.mouseX, p5.mouseY, currentSettings, windowDimensions);

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

        updateDrops(dropsRef.current, currentSettings, windowDimensions);
    }, [currentSettings, windowDimensions]);

    return (
        <Sketch 
            style={{
                position: "absolute", 
                top: "0", 
                left: "0", 
                zIndex: -1,
                width: "100%",
                height: "100%"
            }} 
            setup={setupFunction} 
            draw={drawFunction} 
        />
    );
}

const updateDrops = (drops, settings, dimensions) => {
    drops.forEach(drop => {
        drop.y += drop.speed * settings.globalSpeedMultiplier;
        if (drop.y > dimensions.height) {
            drop.y = 0;
            // Redistribuir aleatoriamente en X cuando la gota se reinicia
            drop.x = Math.round(Math.random() * dimensions.width);
        }

        if (drop.y < -settings.dropLength) {
            drop.y = dimensions.height;
            // Redistribuir aleatoriamente en X cuando la gota se reinicia
            drop.x = Math.round(Math.random() * dimensions.width);
        }
    });
}

const processDrop = (drop, mouseX, mouseY, settings, dimensions) => {
    const points = []

    const initialPoint = {
        x: drop.x,
        y: drop.y
    }
    const endPoint = {
        x: drop.x,
        y: drop.y + settings.dropLength + (settings.dropLength * 0.5 * drop.speed)
    }

    if (Math.abs(drop.x - mouseX) > settings.mouseInteractionRadius) {
        points.push(initialPoint);
        points.push(endPoint);
    } else {

        const steps = (endPoint.y - initialPoint.y) / settings.interactionStepDivider;

        const stepLength = (endPoint.y - initialPoint.y) / steps

        for (let currentY = initialPoint.y; currentY < endPoint.y; currentY += stepLength) {

            if (distance(initialPoint.x, currentY, mouseX, mouseY) > settings.mouseInteractionRadius) {
                if (currentY < mouseY) {    
                    points.push({x: initialPoint.x, y: currentY});
                } else {                    

                    let calculatedX = umbrellaModifyX(initialPoint.x, mouseX, drop.seed, settings);
                    const lastX = points.length > 0 ? points[points.length - 1].x : initialPoint.x;

                    const xDiff = Math.abs(calculatedX - lastX);
                    if (xDiff > 20) {
                        // Handle large x difference
                        calculatedX = lastX;
                    }

                    points.push({
                        x: calculatedX,
                        y: currentY
                    });
                }
            } else {

                let translatedX = calculateCircleX(Math.round(currentY) - mouseY, settings);
                translatedX = (
                    initialPoint.x > mouseX
                        ? mouseX + translatedX + noiseOffset(drop.seed)
                        : mouseX - translatedX - noiseOffset(drop.seed)
                )

                if (currentY > mouseY) {
                    translatedX = umbrellaModifyX(
                        translatedX,
                        mouseX,
                        drop.seed,
                        settings
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
        point.x = windOffset(point.x, index * (1 / points.length), settings);
    });

    return points;
}

const distance = (x1, y1, x2, y2) => {
    const a = x1 - x2;
    const b = y1 - y2;

    return Math.sqrt(a*a + b*b);
}

const calculateCircleX = (y, settings) => {
    const x = Math.floor(
        Math.sqrt(Math.pow(settings.mouseInteractionRadius, 2) - Math.pow(Math.floor(y), 2))
    );

    return x;
}

const umbrellaModifyX = (x, mouseX, seed, settings) => {
    if (!settings.useUmbrella) return x;

    let value = x;
    if (Math.abs(x - mouseX) < settings.mouseUmbrellaShadow * settings.mouseInteractionRadius) {
        value = x > mouseX
            ? (mouseX + settings.mouseUmbrellaShadow * settings.mouseInteractionRadius) + noiseOffset(seed)
            : (mouseX - settings.mouseUmbrellaShadow * settings.mouseInteractionRadius) - noiseOffset(seed);
    }

    return value;
}

const noiseOffset = (seed) => {
    return Math.round(Math.cos(seed) * 4);
}

const windOffset = (x, distanceFromOrigin, settings) => {
    return x + distanceFromOrigin * settings.windSpeed;
}

const _frictionOffset = (x, distanceFromOrigin, settings) => {
    return Math.round(Math.cos(x + distanceFromOrigin) * settings.windSpeed);
}