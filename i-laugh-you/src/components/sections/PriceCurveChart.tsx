"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { useTranslation } from "react-i18next";
import { priceAt, formatPrice, type Currency } from "@/lib/pricing";
import { TOTAL_PIECES } from "@/lib/piece-config";

interface PriceCurveChartProps {
  soldPieceCount: number | null;
  totalPieces: number;
  currency: Currency;
}

const LAST_IMAGE = TOTAL_PIECES - 1;

export default function PriceCurveChart({
  soldPieceCount,
  totalPieces,
  currency,
}: PriceCurveChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const hasAnimated = useRef(false);
  const [isVisible, setIsVisible] = useState(false);
  const { t, i18n } = useTranslation("home");

  // IntersectionObserver to detect when chart scrolls into view
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          setIsVisible(true);
          hasAnimated.current = true;
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(svg);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const currentImage = soldPieceCount ?? 0;

    // Generate data points (sample every ~100 for performance)
    const data: { x: number; y: number }[] = [];
    for (let i = 0; i <= LAST_IMAGE; i += 100) {
      data.push({ x: i, y: priceAt(i) });
    }
    // Ensure last point is included
    if (data[data.length - 1].x !== LAST_IMAGE) {
      data.push({ x: LAST_IMAGE, y: priceAt(LAST_IMAGE) });
    }
    // Ensure current position is in the data
    const currentPrice = priceAt(currentImage);

    // Dimensions — use actual container size so viewBox fills it perfectly
    const containerWidth = svg.parentElement?.clientWidth ?? 800;
    const containerHeight = svg.parentElement?.clientHeight ?? 400;
    const isMobile = containerWidth < 600;
    const margin = isMobile
      ? { top: 14, right: 12, bottom: 40, left: 40 }
      : { top: 20, right: 30, bottom: 50, left: 65 };
    const width = Math.min(800, containerWidth);
    const height = isMobile ? Math.max(200, containerHeight) : 400;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Clear previous
    d3.select(svg).selectAll("*").remove();

    const root = d3
      .select(svg)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    // --- SVG Defs: gradients & filters ---
    const defs = root.append("defs");

    // Area fill gradient (pink → transparent going down)
    const areaGrad = defs.append("linearGradient")
      .attr("id", "area-fill")
      .attr("x1", "0").attr("y1", "0")
      .attr("x2", "0").attr("y2", "1");
    areaGrad.append("stop").attr("offset", "0%").attr("stop-color", "rgba(255, 0, 105, 0.4)");
    areaGrad.append("stop").attr("offset", "50%").attr("stop-color", "rgba(255, 0, 105, 0.12)");
    areaGrad.append("stop").attr("offset", "100%").attr("stop-color", "rgba(255, 0, 105, 0)");

    // Line stroke gradient (warm pink → hot pink along the curve)
    const lineGrad = defs.append("linearGradient")
      .attr("id", "line-stroke")
      .attr("x1", "0").attr("y1", "1")
      .attr("x2", "1").attr("y2", "0");
    lineGrad.append("stop").attr("offset", "0%").attr("stop-color", "#ff6b9d");
    lineGrad.append("stop").attr("offset", "100%").attr("stop-color", "#ff0069");

    // Glow filter for the line (two-layer: soft wide + tight bright)
    const glow = defs.append("filter")
      .attr("id", "line-glow")
      .attr("x", "-25%").attr("y", "-25%")
      .attr("width", "150%").attr("height", "150%");
    glow.append("feGaussianBlur").attr("in", "SourceGraphic").attr("stdDeviation", "8").attr("result", "blur-wide");
    glow.append("feGaussianBlur").attr("in", "SourceGraphic").attr("stdDeviation", "3").attr("result", "blur-tight");
    const merge = glow.append("feMerge");
    merge.append("feMergeNode").attr("in", "blur-wide");
    merge.append("feMergeNode").attr("in", "blur-tight");
    merge.append("feMergeNode").attr("in", "SourceGraphic");

    // Dot glow filter
    const dotGlow = defs.append("filter")
      .attr("id", "dot-glow")
      .attr("x", "-100%").attr("y", "-100%")
      .attr("width", "300%").attr("height", "300%");
    dotGlow.append("feGaussianBlur").attr("stdDeviation", "6").attr("result", "blur");
    const dotMerge = dotGlow.append("feMerge");
    dotMerge.append("feMergeNode").attr("in", "blur");
    dotMerge.append("feMergeNode").attr("in", "SourceGraphic");

    const g = root
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3.scaleLinear().domain([0, LAST_IMAGE]).range([0, innerWidth]);
    const yScale = d3.scaleLinear().domain([0, 850]).range([innerHeight, 0]);

    // Grid lines (subtle)
    g.append("g")
      .attr("class", "grid-y")
      .selectAll("line")
      .data(yScale.ticks(10))
      .enter()
      .append("line")
      .attr("x1", 0)
      .attr("x2", innerWidth)
      .attr("y1", (d) => yScale(d))
      .attr("y2", (d) => yScale(d))
      .attr("stroke", "rgba(255,255,255,0.08)")
      .attr("stroke-width", 0.5)
      .attr("stroke-dasharray", "3,5");

    g.append("g")
      .attr("class", "grid-x")
      .selectAll("line")
      .data(xScale.ticks(7))
      .enter()
      .append("line")
      .attr("x1", (d) => xScale(d))
      .attr("x2", (d) => xScale(d))
      .attr("y1", 0)
      .attr("y2", innerHeight)
      .attr("stroke", "rgba(255,255,255,0.08)")
      .attr("stroke-width", 0.5)
      .attr("stroke-dasharray", "3,5");

    // X axis
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(7)
      .tickFormat((d) => String(d));

    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(xAxis)
      .call((sel) => {
        sel.selectAll("line, path").attr("stroke", "rgba(255,255,255,0.25)");
        sel.selectAll("text").attr("fill", "rgba(255,255,255,0.7)").attr("font-size", "12px");
      });

    // X axis label
    g.append("text")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight + 42)
      .attr("fill", "rgba(255,255,255,0.7)")
      .attr("text-anchor", "middle")
      .attr("font-size", "14px")
      .text(t("chart.xAxis"));

    // Y axis
    const yAxis = d3.axisLeft(yScale).ticks(10);

    g.append("g")
      .call(yAxis)
      .call((sel) => {
        sel.selectAll("line, path").attr("stroke", "rgba(255,255,255,0.25)");
        sel.selectAll("text").attr("fill", "rgba(255,255,255,0.7)").attr("font-size", "12px");
      });

    // Y axis label
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerHeight / 2)
      .attr("y", -50)
      .attr("fill", "rgba(255,255,255,0.7)")
      .attr("text-anchor", "middle")
      .attr("font-size", "14px")
      .text(t("chart.yAxis"));

    // Line generator
    const line = d3
      .line<{ x: number; y: number }>()
      .x((d) => xScale(d.x))
      .y((d) => yScale(d.y))
      .curve(d3.curveMonotoneX);

    // Area generator (fill under curve)
    const area = d3
      .area<{ x: number; y: number }>()
      .x((d) => xScale(d.x))
      .y0(innerHeight)
      .y1((d) => yScale(d.y))
      .curve(d3.curveMonotoneX);

    // --- Gradient area fill under the curve ---
    const areaPath = g.append("path")
      .datum(data)
      .attr("fill", "url(#area-fill)")
      .attr("d", area);

    // --- The curve line with glow ---
    const path = g.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "url(#line-stroke)")
      .attr("stroke-width", 3)
      .attr("stroke-linecap", "round")
      .attr("stroke-linejoin", "round")
      .attr("filter", "url(#line-glow)")
      .attr("d", line);

    // Animate the line drawing + area reveal when visible
    const pathNode = path.node();
    if (pathNode && isVisible) {
      const totalLength = pathNode.getTotalLength();
      path
        .attr("stroke-dasharray", `${totalLength} ${totalLength}`)
        .attr("stroke-dashoffset", totalLength)
        .transition()
        .duration(2000)
        .ease(d3.easeQuadOut)
        .attr("stroke-dashoffset", 0);

      // Clip-reveal the area in sync with the line
      const clipId = "area-clip";
      defs.append("clipPath").attr("id", clipId)
        .append("rect")
        .attr("x", 0).attr("y", 0)
        .attr("width", 0).attr("height", innerHeight)
        .transition()
        .duration(2000)
        .ease(d3.easeQuadOut)
        .attr("width", innerWidth);

      areaPath.attr("clip-path", `url(#${clipId})`);
    } else if (pathNode && !isVisible) {
      // Hide line until animation triggers
      const totalLength = pathNode.getTotalLength();
      path
        .attr("stroke-dasharray", `${totalLength} ${totalLength}`)
        .attr("stroke-dashoffset", totalLength);
      areaPath.style("opacity", 0);
    }

    // Current position dot (yellow, with glow + pulse)
    const dotGroup = g.append("g").attr("class", "current-dot");

    // Pulsing ring behind dot
    const pulseRing = dotGroup
      .append("circle")
      .attr("cx", xScale(currentImage))
      .attr("cy", yScale(currentPrice))
      .attr("r", 8)
      .attr("fill", "none")
      .attr("stroke", "rgba(255, 255, 0, 0.5)")
      .attr("stroke-width", 2)
      .style("opacity", 0);

    const dot = dotGroup
      .append("circle")
      .attr("cx", xScale(currentImage))
      .attr("cy", yScale(currentPrice))
      .attr("r", isVisible ? 0 : 7)
      .attr("fill", "rgba(255, 255, 0, 1)")
      .attr("filter", "url(#dot-glow)");

    // Animate dot appearing after line draws
    if (isVisible) {
      dot
        .transition()
        .delay(1800)
        .duration(400)
        .ease(d3.easeBackOut)
        .attr("r", 7)
        .on("end", () => {
          // Start pulsing ring animation
          const pulse = () => {
            pulseRing
              .style("opacity", 0.5)
              .attr("r", 7)
              .transition()
              .duration(1800)
              .ease(d3.easeQuadOut)
              .attr("r", 20)
              .style("opacity", 0)
              .on("end", pulse);
          };
          pulse();
        });
    }

    // Tooltip for current position
    const tooltipG = g.append("g").attr("class", "tooltip-group")
      .style("opacity", isVisible ? 0 : 1);

    const tooltipX = Math.min(
      xScale(currentImage) + 15,
      innerWidth - 100
    );
    const tooltipY = Math.max(yScale(currentPrice) - 15, 30);

    const tooltipRect = tooltipG
      .append("rect")
      .attr("x", tooltipX)
      .attr("y", tooltipY - 18)
      .attr("rx", 6)
      .attr("ry", 6)
      .attr("fill", "rgba(0,0,0,0.75)")
      .attr("stroke", "rgba(255,255,255,0.15)")
      .attr("stroke-width", 1);

    const tooltipText1 = tooltipG
      .append("text")
      .attr("x", tooltipX + 8)
      .attr("y", tooltipY - 4)
      .attr("fill", "white")
      .attr("font-size", "12px")
      .attr("font-weight", "bold")
      .text(String(currentImage));

    const tooltipText2 = tooltipG
      .append("text")
      .attr("x", tooltipX + 8)
      .attr("y", tooltipY + 12)
      .attr("fill", "rgba(255,255,255,0.8)")
      .attr("font-size", "11px")
      .text(t("chart.priceLabel", { price: formatPrice(currentPrice, currency) }));

    // Size tooltip rect to fit text
    const bbox1 = (tooltipText1.node() as SVGTextElement)?.getBBox();
    const bbox2 = (tooltipText2.node() as SVGTextElement)?.getBBox();
    if (bbox1 && bbox2) {
      const w = Math.max(bbox1.width, bbox2.width) + 16;
      const h = bbox1.height + bbox2.height + 14;
      tooltipRect.attr("width", w).attr("height", h);
    } else {
      tooltipRect.attr("width", 90).attr("height", 38);
    }

    // Animate tooltip appearing after dot
    if (isVisible) {
      tooltipG
        .transition()
        .delay(2100)
        .duration(400)
        .style("opacity", 1);
    }

    // Interactive hover tooltip
    const hoverLine = g
      .append("line")
      .attr("stroke", "rgba(255,255,255,0.2)")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "4,4")
      .attr("y1", 0)
      .attr("y2", innerHeight)
      .style("display", "none");

    const hoverDot = g
      .append("circle")
      .attr("r", 5)
      .attr("fill", "rgba(255, 0, 105, 1)")
      .attr("stroke", "white")
      .attr("stroke-width", 1.5)
      .attr("filter", "url(#dot-glow)")
      .style("display", "none");

    const hoverTooltipG = g.append("g").style("display", "none");

    const hoverRect = hoverTooltipG
      .append("rect")
      .attr("rx", 6)
      .attr("ry", 6)
      .attr("fill", "rgba(0,0,0,0.8)")
      .attr("stroke", "rgba(255,255,255,0.15)")
      .attr("stroke-width", 1);

    const hoverTextLine1 = hoverTooltipG
      .append("text")
      .attr("fill", "white")
      .attr("font-size", "12px")
      .attr("font-weight", "bold");

    const hoverTextLine2 = hoverTooltipG
      .append("text")
      .attr("fill", "rgba(255,255,255,0.8)")
      .attr("font-size", "11px");

    // Overlay rect for mouse events
    g.append("rect")
      .attr("width", innerWidth)
      .attr("height", innerHeight)
      .attr("fill", "transparent")
      .on("mousemove", (event: MouseEvent) => {
        const [mx] = d3.pointer(event);
        const imageNum = Math.round(xScale.invert(mx));
        const clamped = Math.max(0, Math.min(LAST_IMAGE, imageNum));
        const price = priceAt(clamped);

        hoverLine
          .attr("x1", xScale(clamped))
          .attr("x2", xScale(clamped))
          .style("display", null);

        hoverDot
          .attr("cx", xScale(clamped))
          .attr("cy", yScale(price))
          .style("display", null);

        const tx = Math.min(xScale(clamped) + 12, innerWidth - 100);
        const ty = Math.max(yScale(price) - 10, 30);

        hoverTextLine1.attr("x", tx + 8).attr("y", ty).text(String(clamped));
        hoverTextLine2
          .attr("x", tx + 8)
          .attr("y", ty + 16)
          .text(t("chart.priceLabel", { price: formatPrice(price, currency) }));

        const b1 = (hoverTextLine1.node() as SVGTextElement)?.getBBox();
        const b2 = (hoverTextLine2.node() as SVGTextElement)?.getBBox();
        const tw = Math.max(b1?.width ?? 60, b2?.width ?? 60) + 16;
        hoverRect
          .attr("x", tx)
          .attr("y", ty - 14)
          .attr("width", tw)
          .attr("height", 38);

        hoverTooltipG.style("display", null);
      })
      .on("mouseleave", () => {
        hoverLine.style("display", "none");
        hoverDot.style("display", "none");
        hoverTooltipG.style("display", "none");
      });
  }, [soldPieceCount, totalPieces, i18n.language, t, currency, isVisible]);

  return (
    <svg
      ref={svgRef}
      style={{ width: "100%", height: "100%", maxHeight: "400px" }}
    />
  );
}
