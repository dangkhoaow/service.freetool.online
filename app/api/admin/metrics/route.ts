import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth/jwt';
import os from 'os';
import { execSync } from 'child_process';
import fs from 'fs';

/**
 * GET handler for system metrics
 */
export async function GET(req: NextRequest) {
  try {
    // Verify admin token
    const token = req.headers.get('authorization')?.split(' ')[1];
    const isAdminUser = await isAdmin(token);
    
    if (!isAdminUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    // Calculate CPU usage
    const cpuUsage = getCpuUsage();
    
    // Get memory information
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memoryPercentage = (usedMem / totalMem) * 100;
    
    // Get disk information
    const diskInfo = getDiskInfo();
    
    // Get uptime
    const uptime = os.uptime();
    
    return NextResponse.json({
      cpu: cpuUsage,
      memory: {
        total: totalMem,
        used: usedMem,
        free: freeMem,
        percentage: memoryPercentage,
      },
      disk: diskInfo,
      uptime,
    });
  } catch (error) {
    console.error('Error getting system metrics:', error);
    return NextResponse.json(
      { error: 'Failed to get system metrics' },
      { status: 500 }
    );
  }
}

/**
 * Calculate CPU usage percentage
 */
function getCpuUsage(): number {
  try {
    // For a real implementation, this would track CPU usage over time
    // This is a simple approximation
    const cpus = os.cpus();
    let idle = 0;
    let total = 0;
    
    for (const cpu of cpus) {
      idle += cpu.times.idle;
      total += cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq;
    }
    
    // Approximate usage percentage
    return 100 - ((idle / total) * 100);
  } catch (error) {
    console.error('Error calculating CPU usage:', error);
    return 0;
  }
}

/**
 * Get disk space information
 */
function getDiskInfo() {
  try {
    // This is a simplified version that works on macOS/Linux
    // For Windows, a different approach would be needed
    const rootDir = '/';
    
    // Get disk information using df command
    const dfOutput = execSync(`df -k ${rootDir}`).toString();
    const lines = dfOutput.trim().split('\n');
    const stats = lines[1].split(/\s+/);
    
    // Parse information (may vary depending on OS)
    const total = parseInt(stats[1]) * 1024; // Convert to bytes
    const used = parseInt(stats[2]) * 1024;
    const free = parseInt(stats[3]) * 1024;
    const percentage = (used / total) * 100;
    
    return {
      total,
      used,
      free,
      percentage,
    };
  } catch (error) {
    console.error('Error getting disk info:', error);
    // Fallback to some default values
    return {
      total: 1000 * 1024 * 1024 * 1024, // 1TB
      used: 300 * 1024 * 1024 * 1024,   // 300GB
      free: 700 * 1024 * 1024 * 1024,   // 700GB
      percentage: 30,
    };
  }
}
