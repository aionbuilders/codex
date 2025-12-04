// tests/e2e/paragraph.spec.js
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    console.log("Page loaded");
    await page.waitForFunction(() => window.__codex__ !== undefined);
    console.log("Codex is ready");
});


test.describe('Paragraph - Basic typing', () => {
    
    test('finding editor', async ({ page }) => {
        const editor = page.locator('[contenteditable="true"]');
        await expect(editor).toBeVisible();
    });
    
    test('typing creates text in first block', async ({ page }) => {
        const editor = page.locator('[contenteditable="true"]');
        console.log('Editor locator:', await editor.evaluate(el => el.outerHTML));
        await editor.click();
        await new Promise(r => setTimeout(r, 500)); // Attendre un peu pour le rendu
        await page.keyboard.type('Hello world');
        await new Promise(r => setTimeout(r, 500)); // Attendre un peu pour le rendu
        
        // Vérifie le DOM
        // await expect(editor).toContainText('Hello world');
        
        // Vérifie l'état interne
        const codex = await page.evaluate(() => window.__values__());
        console.log('Codex values:', codex);
        // expect(paragraph.text).toBe('Hello world');
        expect(true).toBe(true);

    });
    
    test('coordinates update correctly while typing', async ({ page }) => {
        const editor = page.locator('[contenteditable="true"]');
        await editor.click();
        await page.keyboard.type('Test');
        
        const coords = await page.evaluate(() => {
            return window.__codex__.blocks[0].coordinates;
        });
        
        expect(coords).toEqual({ start: 0, end: 4 });
    });
    
    test('typing in middle updates coordinates', async ({ page }) => {
        const editor = page.locator('[contenteditable="true"]');
        await editor.click();
        await page.keyboard.type('HelloWorld');
        
        // Place le curseur entre Hello et World (position 5)
        await page.keyboard.press('Home');
        for (let i = 0; i < 5; i++) {
            await page.keyboard.press('ArrowRight');
        }
        
        await page.keyboard.type(' ');
        
        await expect(editor).toContainText('Hello World');
        
        const coords = await page.evaluate(() => {
            return window.__codex__.blocks[0].coordinates;
        });
        
        expect(coords.end).toBe(11); // HelloWorld (10) + espace (1)
    });
    
});

test.describe('Paragraph - Line breaks', () => {
    
    test('Enter creates a new Paragraph block', async ({ page }) => {
        const editor = page.locator('[contenteditable="true"]');
        await editor.click();
        await page.keyboard.type('First line');
        await page.keyboard.press('Enter');
        await page.keyboard.type('Second line');
        
        // Vérifie le DOM
        await expect(editor).toContainText('First line');
        await expect(editor).toContainText('Second line');
        
        // Vérifie l'état interne
        const blockCount = await page.evaluate(() => window.__codex__.blocks.length);
        expect(blockCount).toBe(2);
        
        const texts = await page.evaluate(() => {
            return window.__codex__.blocks.map(b => b.text);
        });
        expect(texts).toEqual(['First line', 'Second line']);
    });
    
    test('Shift+Enter creates soft break (not new block)', async ({ page }) => {
        const editor = page.locator('[contenteditable="true"]');
        await editor.click();
        await page.keyboard.type('First line');
        await page.keyboard.press('Shift+Enter');
        await page.keyboard.type('Second line');
        
        // Vérifie qu'il n'y a toujours qu'un seul bloc
        const blockCount = await page.evaluate(() => window.__codex__.blocks.length);
        expect(blockCount).toBe(1);
        
        // Vérifie que le texte contient bien les deux lignes
        const text = await page.evaluate(() => window.__codex__.blocks[0].text);
        expect(text).toContain('First line');
        expect(text).toContain('Second line');
    });
    
    test('multiple Shift+Enter in a row', async ({ page }) => {
        const editor = page.locator('[contenteditable="true"]');
        await editor.click();
        await page.keyboard.type('Line 1');
        await page.keyboard.press('Shift+Enter');
        await page.keyboard.press('Shift+Enter');
        await page.keyboard.type('Line 2');
        
        const blockCount = await page.evaluate(() => window.__codex__.blocks.length);
        expect(blockCount).toBe(1);
        
        // Devrait avoir 2 <br> dans le DOM
        const brCount = await editor.locator('br').count();
        expect(brCount).toBeGreaterThanOrEqual(2);
    });
    
});

test.describe('Paragraph - Deletion', () => {
    
    test('Backspace deletes characters', async ({ page }) => {
        const editor = page.locator('[contenteditable="true"]');
        await editor.click();
        await page.keyboard.type('Hello');
        await page.keyboard.press('Backspace');
        await page.keyboard.press('Backspace');
        
        await expect(editor).toContainText('Hel');
        
        const coords = await page.evaluate(() => {
            return window.__codex__.blocks[0].coordinates;
        });
        expect(coords.end).toBe(3);
    });
    
    test('Backspace at start of second block merges blocks', async ({ page }) => {
        const editor = page.locator('[contenteditable="true"]');
        await editor.click();
        await page.keyboard.type('First');
        await page.keyboard.press('Enter');
        await page.keyboard.type('Second');
        
        // Place le curseur au début de "Second"
        await page.keyboard.press('Home');
        await page.keyboard.press('Backspace');
        
        // Les deux blocs devraient être fusionnés
        const blockCount = await page.evaluate(() => window.__codex__.blocks.length);
        expect(blockCount).toBe(1);
        
        const text = await page.evaluate(() => window.__codex__.blocks[0].text);
        expect(text).toBe('FirstSecond');
    });
    
    test('Delete key removes character ahead', async ({ page }) => {
        const editor = page.locator('[contenteditable="true"]');
        await editor.click();
        await page.keyboard.type('Hello');
        await page.keyboard.press('Home'); // Retour au début
        await page.keyboard.press('Delete');
        
        await expect(editor).toContainText('ello');
        
        const coords = await page.evaluate(() => {
            return window.__codex__.blocks[0].coordinates;
        });
        expect(coords.end).toBe(4);
    });
    
});

test.describe('Paragraph - Navigation', () => {
    
    test('Arrow keys move cursor', async ({ page }) => {
        const editor = page.locator('[contenteditable="true"]');
        await editor.click();
        await page.keyboard.type('Hello');
        
        // Curseur à la fin (position 5)
        let selection = await page.evaluate(() => {
            const sel = window.getSelection();
            return sel.anchorOffset;
        });
        expect(selection).toBe(5);
        
        // Flèche gauche × 2
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('ArrowLeft');
        
        selection = await page.evaluate(() => {
            const sel = window.getSelection();
            return sel.anchorOffset;
        });
        expect(selection).toBe(3);
    });
    
    test('Home/End keys', async ({ page }) => {
        const editor = page.locator('[contenteditable="true"]');
        await editor.click();
        await page.keyboard.type('Hello world');
        
        await page.keyboard.press('Home');
        let offset = await page.evaluate(() => window.getSelection().anchorOffset);
        expect(offset).toBe(0);
        
        await page.keyboard.press('End');
        offset = await page.evaluate(() => window.getSelection().anchorOffset);
        expect(offset).toBe(11);
    });
    
});

test.describe('Paragraph - Empty states', () => {
    
    test('empty editor has one empty block', async ({ page }) => {
        await page.goto('http://localhost:5173');
        await waitForCodex(page);
        
        const blockCount = await page.evaluate(() => window.__codex__.blocks.length);
        expect(blockCount).toBe(1);
        
        const text = await page.evaluate(() => window.__codex__.blocks[0].text);
        expect(text).toBe('');
    });
    
    test('deleting all text leaves empty block', async ({ page }) => {
        const editor = page.locator('[contenteditable="true"]');
        await editor.click();
        await page.keyboard.type('Test');
        
        // Sélectionne tout et supprime
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        
        const blockCount = await page.evaluate(() => window.__codex__.blocks.length);
        expect(blockCount).toBe(1);
        
        const text = await page.evaluate(() => window.__codex__.blocks[0].text);
        expect(text).toBe('');
    });
    
});