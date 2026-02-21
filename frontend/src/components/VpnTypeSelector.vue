<template>
  <div class="vpn-selector">
    <h3 class="title">选择 VPN 类型</h3>
    <div class="cards">
      <div
        :class="['card', { active: modelValue === 'v2ray' }]"
        @click="$emit('update:modelValue', 'v2ray')"
      >
        <div class="card-header">
          <el-icon class="icon" :size="48"><Connection /></el-icon>
          <h4>V2Ray</h4>
        </div>
        <div class="card-body">
          <p>VMess 协议</p>
          <ul class="features">
            <li>✓ 稳定成熟</li>
            <li>✓ 广泛支持</li>
            <li>✓ 性能良好</li>
          </ul>
        </div>
      </div>

      <div
        :class="['card', { active: modelValue === 'xray' }]"
        @click="$emit('update:modelValue', 'xray')"
      >
        <div class="card-header">
          <el-icon class="icon" :size="48"><Lightning /></el-icon>
          <h4>Xray</h4>
        </div>
        <div class="card-body">
          <p>VLESS 协议</p>
          <ul class="features">
            <li>✓ 性能更优</li>
            <li>✓ 延迟更低</li>
            <li>✓ 功能先进</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Connection, Lightning } from '@element-plus/icons-vue';

defineProps<{
  modelValue: 'v2ray' | 'xray';
}>();

defineEmits<{
  (e: 'update:modelValue', value: 'v2ray' | 'xray'): void;
}>();
</script>

<style scoped>
.vpn-selector {
  margin-bottom: 30px;
}

.title {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 20px;
  color: #1d1d1f;
  letter-spacing: -0.3px;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.card {
  border: 1.5px solid #e5e5e7;
  border-radius: 14px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #fff;
}

.card:hover {
  border-color: #007aff;
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 122, 255, 0.12);
}

.card.active {
  border-color: #007aff;
  background: #f5f9ff;
  box-shadow: 0 4px 16px rgba(0, 122, 255, 0.2);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.card-header .icon {
  color: #007aff;
}

.card-header h4 {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  color: #1d1d1f;
  letter-spacing: -0.3px;
}

.card-body p {
  font-size: 14px;
  color: #86868b;
  margin: 0 0 12px 0;
}

.features {
  list-style: none;
  padding: 0;
  margin: 0;
}

.features li {
  font-size: 13px;
  color: #86868b;
  margin-bottom: 6px;
}
</style>
